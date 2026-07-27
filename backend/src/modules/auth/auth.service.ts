import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService, SafeUserProfile } from '../users/users.service';
import { TokenService, PaireDeJetons } from './token.service';
import { TwoFactorService } from './two-factor.service';
import { RoleLibelle } from '../users/entities/role-acces.entity';
import * as argon2 from 'argon2';

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

    const motDePasseValide = await argon2.verify(utilisateur.motDePasseHash, motDePasse);
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
    email: string;
    motDePasse: string;
    role: RoleLibelle;
  }): Promise<{ message: string; user: SafeUserProfile }> {
    const { nom, email, motDePasse, role } = params;

    if (role === RoleLibelle.ADMINISTRATEUR) {
      throw new BadRequestException({
        error: {
          code: 'FORBIDDEN_ROLE',
          message: 'Le rôle Administrateur ne peut pas être attribué par auto-inscription.',
          status: 400,
        },
      });
    }

    if (!/[A-Z]/.test(motDePasse)) {
      throw new BadRequestException({
        error: { code: 'WEAK_PASSWORD', message: 'Le mot de passe doit contenir au moins une lettre majuscule.', status: 400 },
      });
    }

    if (!/[0-9]/.test(motDePasse)) {
      throw new BadRequestException({
        error: { code: 'WEAK_PASSWORD', message: 'Le mot de passe doit contenir au moins un chiffre.', status: 400 },
      });
    }

    const user = await this.usersService.createUser({ nom, email, motDePasse, role });

    return {
      message: 'Compte créé avec succès. Un administrateur activera votre compte prochainement.',
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
}
