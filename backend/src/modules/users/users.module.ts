/**
 * backend/src/modules/users/users.module.ts
 * Exporte UsersService pour AuthModule et autres modules qui en dépendent.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Utilisateur } from './entities/utilisateur.entity';
import { RoleAcces } from './entities/role-acces.entity';
import { Cabinet } from './entities/cabinet.entity';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([Utilisateur, RoleAcces, Cabinet])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
