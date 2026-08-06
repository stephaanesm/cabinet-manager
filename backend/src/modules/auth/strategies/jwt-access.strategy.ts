/**
 * modules/auth/strategies/jwt-access.strategy.ts
 * ---------------------------------------------------------------------------
 * Stratégie Passport nommée "jwt-access" (voir JwtAuthGuard qui l'invoque par
 * ce nom). Extrait le jeton de l'en-tête "Authorization: Bearer <token>",
 * vérifie sa signature et son expiration, puis transforme le payload décodé
 * en `AuthenticatedUser` qui sera attaché à `request.user`.
 *
 * NOTE : le refresh token n'est volontairement PAS un JWT (voir
 * token.service.ts) — il n'y a donc pas de "stratégie Passport" équivalente
 * pour lui ; sa validation se fait directement dans TokenService.rafraichir()
 * contre la table refresh_tokens.
 * ---------------------------------------------------------------------------
 */
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AccessTokenPayload, AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor() {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new Error("JWT_ACCESS_SECRET manquant dans les variables d'environnement.");
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // Passport rejette automatiquement un jeton expiré (401)
      secretOrKey: secret,
    });
  }

  /**
   * Appelée automatiquement par Passport UNE FOIS la signature et
   * l'expiration validées. La valeur retournée devient `request.user`.
   */
  validate(payload: AccessTokenPayload): AuthenticatedUser {
    return {
      id: payload.sub,
      cabinetId: payload.cabinetId,
      role: payload.role,
      permissions: payload.permissions,
      email: payload.email,
    };
  }
}
