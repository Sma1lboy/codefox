import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Projects } from './project.model';
import { ProjectPackages } from './project-packages.model';
import { ProjectsService } from './project.service';
import { ProjectsResolver } from './project.resolver';
import { AuthModule } from '../auth/auth.module';
import { ProjectGuard } from '../guard/project.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Projects, ProjectPackages]),
    AuthModule, // Import AuthModule to provide JwtService to the ProjectGuard
  ],
  providers: [ProjectsService, ProjectsResolver, ProjectGuard],
  exports: [ProjectsService, ProjectGuard],
})
export class ProjectModule {}
