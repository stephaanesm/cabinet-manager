/**
 * common/filters/http-exception.filter.ts
 * ---------------------------------------------------------------------------
 * Filtre global qui garantit que TOUTE erreur renvoyée par l'API respecte le
 * format standard défini dans les spécifications techniques (section 1.2) :
 *
 *   { "error": { "code": "...", "message": "...", "status": 404 } }
 *
 * Pourquoi centraliser ceci ici plutôt que de construire ce format à la main
 * dans chaque contrôleur : si un développeur lève une exception Nest standard
 * (ex. `throw new NotFoundException('...')`) sans y penser, ce filtre la
 * reformate automatiquement au bon format — impossible d'oublier.
 *
 * DÉBOGAGE : en environnement de développement (NODE_ENV !== 'production'),
 * la stack trace complète est incluse dans la réponse JSON (champ "stack")
 * pour accélérer le diagnostic ; elle est automatiquement omise en production
 * pour ne jamais exposer de détails internes à un client externe.
 * ---------------------------------------------------------------------------
 */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorBody {
  code: string;
  message: string;
  status: number;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, body } = this.buildErrorBody(exception);

    // Journalisation serveur systématique (utile pour corréler avec le
    // journal_activite applicatif en cas d'investigation d'incident).
    this.logger.error(
      `${request.method} ${request.url} -> ${status} ${body.code} : ${body.message}`,
    );

    const payload: { error: ErrorBody; stack?: string } = { error: body };
    if (process.env.NODE_ENV !== 'production' && exception instanceof Error) {
      payload.stack = exception.stack;
    }

    response.status(status).json(payload);
  }

  private buildErrorBody(exception: unknown): { status: number; body: ErrorBody } {
    // Cas 1 : exception Nest "normale" (HttpException et ses sous-classes :
    // NotFoundException, ForbiddenException, BadRequestException, etc.)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();

      // Si le contrôleur a déjà levé l'exception avec notre format
      // { error: { code, message, status } }, on le réutilise tel quel.
      if (typeof res === 'object' && res !== null && 'error' in res) {
        return { status, body: (res as { error: ErrorBody }).error };
      }

      // Sinon (cas standard `throw new NotFoundException('message')`),
      // on construit un code générique à partir du statut HTTP.
      const message =
        typeof res === 'object' && res !== null && 'message' in res
          ? (res as { message: string | string[] }).message
          : exception.message;

      return {
        status,
        body: {
          code: this.defaultCodeForStatus(status),
          message: Array.isArray(message) ? message.join(' ') : message,
          status,
        },
      };
    }

    // Cas 2 : erreur non prévue (bug, exception de driver DB, etc.)
    // On ne renvoie JAMAIS le message brut d'une erreur inconnue au client
    // (risque de fuite d'information technique) : message générique côté
    // client, détail complet dans les logs serveur (ligne this.logger.error
    // ci-dessus, et champ "stack" en environnement de développement).
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        code: 'INTERNAL_ERROR',
        message: 'Une erreur interne est survenue. Veuillez réessayer ultérieurement.',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      },
    };
  }

  private defaultCodeForStatus(status: number): string {
    const map: Record<number, string> = {
      400: 'VALIDATION_ERROR',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'BUSINESS_RULE_VIOLATION',
      429: 'RATE_LIMITED',
    };
    return map[status] ?? 'INTERNAL_ERROR';
  }
}
