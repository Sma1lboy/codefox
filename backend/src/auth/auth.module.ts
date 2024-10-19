import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './role.model';
import { Menu } from './menu/menu.model';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role, Menu]),
    JwtModule.register({
      secret: 'your-secret-key-tests',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  exports: [JwtModule],
})
export class AuthModule {}
