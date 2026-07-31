/**
 * backend/src/modules/sync/sync.module.ts
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { Audience } from '../audiences/entities/audience.entity';
import { Facture } from '../facturation/entities/facture.entity';
import { Document } from '../documents/entities/document.entity';
import { JournalModule } from '../journal/journal.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Dossier, Audience, Facture, Document]),
    JournalModule,
  ],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
