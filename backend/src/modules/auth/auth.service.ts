/**
 * backend/src/modules/auth/auth.service.ts (à créer)
 * Stub d'AuthService — à compléter dans une prochaine livraison.
 * Ce fichier est référencé par auth.module.ts.
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { TokenService, PaireDeJetons } from './token.service';
import { TwoFactorService } from './two-factor.service';
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

  async login(
    email: string,
    motDePasse: string,
    appareilId: string,
  ): Promise<LoginResponse> {
    const utilisateur = await this.usersService.findByEmail(email);

    if (!utilisateur || !utilisateur.actif) {
      throw new UnauthorizedException({ error: { code: 'UNAUTHORIZED', message: 'Identifiants invalides.', status: 401 } });
    }

    // Vérification du mot de passe (argon2id)
    const motDePasseValide = await argon2.verify(utilisateur.motDePasseHash, motDePasse);
    if (!motDePasseValide) {
      await this.usersService.enregistrerEchecConnexion(utilisateur.id);
      throw new UnauthorizedException({ error: { code: 'UNAUTHORIZED', message: 'Identifiants invalides.', status: 401 } });
    }

    await this.usersService.reinitialiserEchecs(utilisateur.id);

    // Résolution des permissions RBAC
    const permissions = utilisateur.roleAcces?.permissions ?? [];

    if (utilisateur.authentif2faActif) {
      // Émettre un preAuthToken court (voir TwoFactorService)
      const preAuthToken = await this.twoFactorService.genererPreAuthToken(utilisateur.id, appareilId);
      return { requiresTwoFactor: true, preAuthToken };
    }

    return this.tokenService.emettrePaireDeJetons(utilisateur, permissions, appareilId);
  }

  async refresh(refreshToken: string, appareilId: string): Promise<PaireDeJetons> {
    const utilisateurId = await this.tokenService.trouverUtilisateurIdParToken(refreshToken);
    if (!utilisateurId) {
      throw new UnauthorizedException({ error: { code: 'UNAUTHORIZED', message: 'Jeton invalide.', status: 401 } });
    }
    const utilisateur = await this.usersService.findById(utilisateurId);
    const permissions = utilisateur.roleAcces?.permissions ?? [];
    return this.tokenService.rafraichir(refreshToken, utilisateur, permissions, appareilId);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokenService.revoquerToken(refreshToken);
  }

  async getMe(utilisateurId: number) {
    return this.usersService.toSafeProfile(await this.usersService.findById(utilisateurId));
  }
}
