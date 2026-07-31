/**
 * backend/src/common/interceptors/audit.interceptor.ts
 * Intercepteur global d'audit journalisant automatiquement toutes les requêtes de modification.
 * Capture l'utilisateur, l'adresse IP, l'horodatage et les données d'action.
 */

import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { JournalService } from '../../modules/journal/journal.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly journalService: JournalService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;

    // Journalise automatiquement uniquement les actions CRUD de modification
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const user = req.user;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '127.0.0.1';
    const url = req.originalUrl || req.url;

    // Extraction du module et du type d'action
    const parts = url.split('/').filter(Boolean);
    const entiteType = parts[1] || parts[0] || 'systeme';
    const action = `${entiteType}.${method.toLowerCase()}`;

    return next.handle().pipe(
      tap({
        next: (data) => {
          if (user && user.cabinetId) {
            this.journalService.enregistrer({
              cabinetId: user.cabinetId,
              utilisateurId: user.id,
              action,
              entiteType,
              entiteId: data?.id ? Number(data.id) : 0,
              donneesApres: data && typeof data === 'object' ? data : null,
              adresseIp: String(ip),
            });
          }
        },
      }),
    );
  }
}
