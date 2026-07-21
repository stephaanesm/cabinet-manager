/**
 * backend/src/modules/dossiers/dossiers.module.ts
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dossier } from './entities/dossier.entity';
import { DossiersService } from './dossiers.service';
import { DossiersController } from './dossiers.controller';
import { ClientsModule } from '../clients/clients.module';
import { JournalModule } from '../journal/journal.module';

@Module({
  imports: [TypeOrmModule.forFeature([Dossier]), ClientsModule, JournalModule],
  controllers: [DossiersController],
  providers: [DossiersService],
  exports: [DossiersService],
})
export class DossiersModule {}
