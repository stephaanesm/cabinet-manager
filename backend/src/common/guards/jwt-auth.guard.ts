/**
 * common/guards/jwt-auth.guard.ts
 * ---------------------------------------------------------------------------
 * Garde globale (appliquée à TOUTE l'application dans app.module.ts via
 * APP_GUARD). Vérifie la présence et la validité d'un jeton d'accès JWT dans
 * l'en-tête "Authorization: Bearer <token>".
 *
 * Deux façons de contourner cette garde :
 *   1. @Public() sur une route (ex. /auth/login) — voir public.decorator.ts
 *   2. Rien d'autre : c'est volontairement la SEULE échappatoire, pour éviter
 *      qu'un développeur oublie de protéger une route par accident.
 *
 * DÉBOGAGE : si une requête légitime reçoit un 401 inattendu, vérifier dans
 * l'ordre :
 *   a) le jeton est-il bien envoyé dans l'en-tête Authorization ?
 *   b) le jeton est-il expiré (voir champ "exp", durée de vie 15 min) ?
 *   c) la route est-elle bien marquée @Public() si elle ne devrait pas
 *      nécessiter d'authentification ?
 * ---------------------------------------------------------------------------
 */
import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt-access') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // On regarde si la route (ou le contrôleur) porte le décorateur @Public().
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // pas de vérification de jeton pour cette route
    }

    // Sinon, on délègue à la stratégie Passport "jwt-access" (voir
    // strategies/jwt-access.strategy.ts) qui décode et valide le jeton.
    return super.canActivate(context);
  }
}
