/**
 * backend/src/modules/users/users.module.ts
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { Utilisateur } from './entities/utilisateur.entity';
import { RoleAcces } from './entities/role-acces.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Utilisateur, RoleAcces])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
