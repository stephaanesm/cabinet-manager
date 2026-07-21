/**
 * backend/src/app.module.ts
 * ---------------------------------------------------------------------------
 * Module racine de l'application Cabinet Manager.
 *
 * Responsabilités :
 *  - Connexion TypeORM → PostgreSQL (variables d'env DB_*)
 *  - Assemblage de tous les modules métier
 *  - Gestion de la configuration globale via variables d'environnement
 *
 * IMPORTANT MULTI-TENANT : la connexion utilise cm_app_user en production
 * (droits restreints via grants_app_role.sql). En développement, cm_admin
 * est acceptable pour les migrations. Ne jamais utiliser cm_admin en prod.
 * ---------------------------------------------------------------------------
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { ClientsModule } from './modules/clients/clients.module';
import { DossiersModule } from './modules/dossiers/dossiers.module';
import { JournalModule } from './modules/journal/journal.module';
import { UsersModule } from './modules/users/users.module';

// Entités TypeORM — toutes déclarées ici pour la découverte automatique
import { HealthController } from './health.controller';
import { RefreshToken } from './modules/auth/entities/refresh-token.entity';
import { Client } from './modules/clients/entities/client.entity';
import { Dossier } from './modules/dossiers/entities/dossier.entity';
import { JournalActivite } from './modules/journal/entities/journal-activite.entity';
import { Cabinet } from './modules/users/entities/cabinet.entity';
import { RoleAcces } from './modules/users/entities/role-acces.entity';
import { Utilisateur } from './modules/users/entities/utilisateur.entity';

@Module({
  imports: [
    // ── Base de données ────────────────────────────────────────────────────
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
      ],
      // NE PAS activer synchronize en production → utiliser les migrations SQL
      // (voir backend/migrations/ et infrastructure/postgres/)
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: true }
        : false,
    }),

    // ── Modules métier ────────────────────────────────────────────────────
    // Ordre : UsersModule en premier car AuthModule en dépend.
    UsersModule,
    AuthModule,
    ClientsModule,
    JournalModule,
    DossiersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
