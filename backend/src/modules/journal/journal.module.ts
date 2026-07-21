/**
 * backend/src/modules/journal/journal.module.ts
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JournalActivite } from './entities/journal-activite.entity';
import { JournalService } from './journal.service';

@Module({
  imports: [TypeOrmModule.forFeature([JournalActivite])],
  providers: [JournalService],
  exports: [JournalService],
})
export class JournalModule {}
