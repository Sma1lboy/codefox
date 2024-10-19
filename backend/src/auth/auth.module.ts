import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Menu } from './menu/menu.model';
import { JwtModule } from '@nestjs/jwt';
import { Role } from './role/role.model';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { User } from 'src/user/user.model';
import { AuthResolver } from './auth.resolver';
import { JwtCacheService } from 'src/auth/jwt-cache.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Role, Menu, User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, AuthResolver, JwtCacheService],
  exports: [AuthService],
})
export class AuthModule {}
