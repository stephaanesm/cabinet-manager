/**
 * backend/src/modules/assistant-ia/assistant-ia.controller.ts
 * Controller de l'Assistant IA Juridique
 */

import { Body, Controller, Post } from '@nestjs/common';
import { AssistantIaService } from './assistant-ia.service';

@Controller('assistant-ia')
export class AssistantIaController {
  constructor(private readonly assistantIaService: AssistantIaService) {}

  @Post('chat')
  async chat(@Body() body: { prompt: string; contexteDossier?: string }) {
    const reponse = await this.assistantIaService.poserQuestion(body.prompt, body.contexteDossier);
    return { reponse };
  }
}
