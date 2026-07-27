/**
 * backend/src/app.module.ts
 * ---------------------------------------------------------------------------
 * Module racine de l'application Cabinet Manager.
 * ---------------------------------------------------------------------------
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AudiencesModule } from './modules/audiences/audiences.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClientsModule } from './modules/clients/clients.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { DossiersModule } from './modules/dossiers/dossiers.module';
import { FacturationModule } from './modules/facturation/facturation.module';
import { JournalModule } from './modules/journal/journal.module';
import { UsersModule } from './modules/users/users.module';

import { HealthController } from './health.controller';
import { Audience } from './modules/audiences/entities/audience.entity';
import { RefreshToken } from './modules/auth/entities/refresh-token.entity';
import { Client } from './modules/clients/entities/client.entity';
import { Document } from './modules/documents/entities/document.entity';
import { Dossier } from './modules/dossiers/entities/dossier.entity';
import { Encaissement } from './modules/facturation/entities/encaissement.entity';
import { Facture } from './modules/facturation/entities/facture.entity';
import { JournalActivite } from './modules/journal/entities/journal-activite.entity';
import { Cabinet } from './modules/users/entities/cabinet.entity';
import { RoleAcces } from './modules/users/entities/role-acces.entity';
import { Utilisateur } from './modules/users/entities/utilisateur.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      database: process.env.DB_NAME ?? 'cabinet_manager',
      username: process.env.DB_USER ?? 'cm_app_user',
      password: process.env.DB_PASSWORD,
      entities: [
        Utilisateur,
        Cabinet,
        RoleAcces,
        RefreshToken,
        Dossier,
        Client,
        JournalActivite,
        Audience,
        Document,
        Facture,
        Encaissement,
      ],
      synchronize: false,
      logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
    }),
    UsersModule,
    AuthModule,
    ClientsModule,
    JournalModule,
    DossiersModule,
    AudiencesModule,
    DocumentsModule,
    FacturationModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
