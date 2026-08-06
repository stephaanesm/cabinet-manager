import { BadRequestException, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';
import * as nodemailer from 'nodemailer';
import { RoleLibelle } from '../users/entities/role-acces.entity';
import { SafeUserProfile, UsersService } from '../users/users.service';
import { PaireDeJetons, TokenService } from './token.service';
import { TwoFactorService } from './two-factor.service';

export interface PreAuthResponse {
  requiresTwoFactor: true;
  preAuthToken: string;
}

export type LoginResponse = PaireDeJetons | PreAuthResponse;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  // ── Connexion ─────────────────────────────────────────────────────────────

  async login(
    email: string,
    motDePasse: string,
    appareilId: string,
  ): Promise<LoginResponse> {
    const utilisateur = await this.usersService.findByEmail(email);

    if (!utilisateur || !utilisateur.actif) {
      throw new UnauthorizedException({
        error: { code: 'UNAUTHORIZED', message: 'Identifiants invalides.', status: 401 },
      });
    }

    const motDePasseValide = utilisateur.motDePasseHash
      ? await argon2.verify(utilisateur.motDePasseHash, motDePasse)
      : false;
    if (!motDePasseValide) {
      await this.usersService.enregistrerEchecConnexion(utilisateur.id);
      throw new UnauthorizedException({
        error: { code: 'UNAUTHORIZED', message: 'Identifiants invalides.', status: 401 },
      });
    }

    await this.usersService.reinitialiserEchecs(utilisateur.id);
    const permissions = utilisateur.roleAcces?.permissions ?? [];

    if (utilisateur.authentif2faActif) {
      const preAuthToken = await this.twoFactorService.genererPreAuthToken(utilisateur.id, appareilId);
      return { requiresTwoFactor: true, preAuthToken };
    }

    return this.tokenService.emettrePaireDeJetons(utilisateur, permissions, appareilId);
  }

  // ── Inscription publique ──────────────────────────────────────────────────
  /**
   * Crée un compte utilisateur inactif (actif = false).
   * L'admin doit activer le compte depuis /admin/utilisateurs.
   * Le rôle Administrateur est interdit par cette voie.
   */
  async register(params: {
    nom: string;
    prenom?: string;
    email: string;
    telephone?: string;
    dateNaissance?: string;
    motDePasse: string;
    role?: RoleLibelle;
  }): Promise<{ message: string; user: SafeUserProfile }> {
    const { nom, prenom, email, telephone, dateNaissance, motDePasse } = params;
    const role = params.role || RoleLibelle.AVOCAT;

    const user = await this.usersService.createUser({
      nom: prenom ? `${nom} ${prenom}` : nom,
      email,
      motDePasse,
      role,
      prenom,
      telephone,
      dateNaissance,
    });

    return {
      message: 'Votre compte Avocat a été créé avec succès. Vous pouvez maintenant vous connecter.',
      user,
    };
  }

  // ── Refresh token ─────────────────────────────────────────────────────────

  async refresh(refreshToken: string, appareilId: string): Promise<PaireDeJetons> {
    const utilisateurId = await this.tokenService.trouverUtilisateurIdParToken(refreshToken);
    if (!utilisateurId) {
      throw new UnauthorizedException({
        error: { code: 'UNAUTHORIZED', message: 'Jeton invalide.', status: 401 },
      });
    }
    const utilisateur = await this.usersService.findById(utilisateurId);
    const permissions = utilisateur.roleAcces?.permissions ?? [];
    return this.tokenService.rafraichir(refreshToken, utilisateur, permissions, appareilId);
  }

  // ── Déconnexion ───────────────────────────────────────────────────────────

  async logout(refreshToken: string): Promise<void> {
    await this.tokenService.revoquerToken(refreshToken);
  }

  // ── Profil courant ────────────────────────────────────────────────────────

  async getMe(utilisateurId: number) {
    return this.usersService.toSafeProfile(await this.usersService.findById(utilisateurId));
  }

  /**
   * Connexion / Inscription sociale (Google / Apple)
   */
  async loginWithSocial(params: {
    email?: string;
    idToken?: string;
    identityToken?: string;
    provider: 'google' | 'apple';
    nom?: string;
    appareilId?: string;
  }): Promise<LoginResponse> {
    const { provider, nom, appareilId = 'social' } = params;
    let cleanEmail = params.email ? params.email.trim().toLowerCase() : '';

    if (!cleanEmail && (params.idToken || params.identityToken)) {
      try {
        const token = (params.idToken || params.identityToken)!;
        const parts = token.split('.');
        if (parts.length >= 2) {
          const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          if (decoded && decoded.email) {
            cleanEmail = decoded.email.trim().toLowerCase();
          }
        }
      } catch (e) {
        console.warn('Erreur décodage token social:', e);
      }
    }

    if (!cleanEmail) {
      throw new BadRequestException({
        error: { code: 'INVALID_SOCIAL_PAYLOAD', message: 'Adresse email ou jeton OAuth invalide.', status: 400 },
      });
    }

    let utilisateur = await this.usersService.findByEmail(cleanEmail);

    if (!utilisateur) {
      const defaultNom = nom || (provider === 'google' ? 'Avocat Google' : 'Avocat Apple');
      await this.usersService.createUser({
        nom: defaultNom,
        email: cleanEmail,
        motDePasse: `Social_${provider}_${Date.now()}`,
        role: RoleLibelle.AVOCAT,
      });
      utilisateur = await this.usersService.findByEmail(cleanEmail);
    }

    if (!utilisateur || !utilisateur.actif) {
      throw new UnauthorizedException({
        error: { code: 'ACCOUNT_DISABLED', message: 'Ce compte a été désactivé.', status: 401 },
      });
    }

    const permissions = utilisateur.roleAcces?.permissions ?? [];
    return this.tokenService.emettrePaireDeJetons(utilisateur, permissions, appareilId);
  }

  // ── OTP EMAIL VERIFICATION (Code à 6 chiffres) ───────────────────────────

  private readonly logger = new Logger('AuthService');
  private otpStore: Map<string, { code: string; expiresAt: number; attempts: number }> = new Map();

  /**
   * Génère et envoie un code OTP à 6 chiffres par email (Nodemailer / SMTP).
   * Utilisé uniquement lors de l'INSCRIPTION pour vérifier l'adresse email.
   */
  async sendOtp(email: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!/\S+@\S+\.\S+/.test(cleanEmail)) {
      throw new BadRequestException({ error: { code: 'INVALID_EMAIL', message: 'Adresse email invalide.', status: 400 } });
    }

    // Générer le code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    this.otpStore.set(cleanEmail, { code, expiresAt, attempts: 0 });

    this.logger.log(`📧 [OTP] Code ${code} généré pour ${cleanEmail}`);

    // ── Envoi de l'email via Brevo REST API ────────────────────────────────────
    const brevoApiKey = process.env.BREVO_SMTP_KEY || '';
    const fromEmail = process.env.BREVO_FROM || 'stephanemomosm@gmail.com';

    if (!brevoApiKey) {
      this.logger.warn(`⚠️ [OTP] BREVO_SMTP_KEY manquante. Code affiché dans les logs.`);
      this.logger.log(`📧 [OTP - FALLBACK] Code pour ${cleanEmail} : ${code}`);
    } else {
      try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': brevoApiKey,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: 'Cabinet Manager', email: fromEmail },
            to: [{ email: cleanEmail }],
            subject: 'Votre code de vérification — Cabinet Manager',
            htmlContent: `
              <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0f172a; color: #f1f5f9; border-radius: 16px; padding: 32px;">
                <h1 style="color: #f59e0b; font-size: 24px; margin-bottom: 8px;">Cabinet Manager</h1>
                <p style="color: #94a3b8; margin-bottom: 24px;">Vérification de votre adresse email</p>
                <div style="background: #1e293b; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                  <p style="color: #94a3b8; font-size: 14px; margin-bottom: 8px;">Votre code de vérification :</p>
                  <span style="font-size: 40px; font-weight: 800; letter-spacing: 8px; color: #f59e0b; font-family: monospace;">${code}</span>
                  <p style="color: #64748b; font-size: 12px; margin-top: 12px;">Ce code expire dans <strong>10 minutes</strong>.</p>
                </div>
                <p style="color: #64748b; font-size: 12px;">Si vous n'avez pas demandé ce code, ignorez cet email.</p>
              </div>
            `,
            textContent: `Votre code de vérification Cabinet Manager : ${code} (valable 10 minutes)`,
          }),
        });

        if (response.ok) {
          this.logger.log(`✅ [OTP] Email envoyé via Brevo API à ${cleanEmail}`);
        } else {
          const errData = await response.json().catch(() => ({}));
          this.logger.warn(`⚠️ [OTP] Erreur Brevo API (${response.status}): ${JSON.stringify(errData)}. Code dans les logs.`);
          this.logger.log(`📧 [OTP - FALLBACK] Code pour ${cleanEmail} : ${code}`);
        }
      } catch (emailError) {
        this.logger.warn(`⚠️ [OTP] Exception Brevo API: ${emailError.message}. Code dans les logs.`);
        this.logger.log(`📧 [OTP - FALLBACK] Code pour ${cleanEmail} : ${code}`);
      }
    }

    return {
      success: true,
      message: `Code de vérification envoyé à ${cleanEmail}. Vérifiez votre boîte de réception.`,
    };
  }

  /**
   * Vérifie le code OTP. Utilisé lors de l'inscription AVANT la création du compte.
   * Ne crée PAS de compte — la création se fait via /auth/register après validation.
   */
  async verifyOtp(email: string, code: string, _appareilId: string = 'otp-verify'): Promise<{ verified: true; email: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const record = this.otpStore.get(cleanEmail);

    if (!record) {
      throw new BadRequestException({ error: { code: 'OTP_EXPIRED', message: 'Aucun code trouvé. Veuillez demander un nouveau code.', status: 400 } });
    }

    if (Date.now() > record.expiresAt) {
      this.otpStore.delete(cleanEmail);
      throw new BadRequestException({ error: { code: 'OTP_EXPIRED', message: 'Le code a expiré (10 minutes). Veuillez en demander un nouveau.', status: 400 } });
    }

    if (record.attempts >= 5) {
      this.otpStore.delete(cleanEmail);
      throw new BadRequestException({ error: { code: 'TOO_MANY_ATTEMPTS', message: 'Trop de tentatives. Demandez un nouveau code.', status: 400 } });
    }

    if (record.code !== code.trim()) {
      record.attempts += 1;
      throw new BadRequestException({ error: { code: 'INVALID_OTP', message: `Code incorrect (tentative ${record.attempts}/5).`, status: 400 } });
    }

    // Code valide — le supprimer du store
    this.otpStore.delete(cleanEmail);

    return { verified: true, email: cleanEmail };
  }

  // ── Token Expo Push ───────────────────────────────────────────────────────

  async enregistrerExpoPushToken(utilisateurId: number, expoPushToken: string): Promise<void> {
    await this.usersService.sauvegarderExpoPushToken(utilisateurId, expoPushToken);
  }
}
