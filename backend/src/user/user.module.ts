import { Module } from '@nestjs/common';
import { UserResolver } from './user.resolver';
import { UserService } from './user.service';
import { DateScalar } from 'src/common/scalar/date.scalar';
import { User } from './user.model';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from 'src/auth/auth.module';
@Module({
  imports: [TypeOrmModule.forFeature([User]), JwtModule, AuthModule],
  providers: [UserResolver, UserService, DateScalar],
  exports: [UserService],
})
export class UserModule {}