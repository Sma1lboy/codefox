import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './role.model';
import { Menu } from './menu/menu.model';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Menu])],
  // providers: [RoleService, MenuService],
  // exports: [RoleService, MenuService],
})
export class AuthModule {}
