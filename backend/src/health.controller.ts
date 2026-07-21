/**
 * backend/src/health.controller.ts
 * Endpoint /api/v1/health utilisé par Docker healthcheck et Traefik.
 */
import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
