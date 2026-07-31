/**
 * backend/src/modules/assistant-ia/assistant-ia.module.ts
 */

import { Module } from '@nestjs/common';
import { AssistantIaController } from './assistant-ia.controller';
import { AssistantIaService } from './assistant-ia.service';

@Module({
  controllers: [AssistantIaController],
  providers: [AssistantIaService],
  exports: [AssistantIaService],
})
export class AssistantIaModule {}
