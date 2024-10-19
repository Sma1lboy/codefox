import { Module } from '@nestjs/common';
import { UserResolver } from './user.resolver';
import { UserService } from './user.service';
import { DateScalar } from 'src/common/scalar/date.scalar';
import { User } from './user.model';
import { TypeOrmModule } from '@nestjs/typeorm';
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UserResolver, UserService, DateScalar],
  exports: [UserService],
})
export class UserModule {}
