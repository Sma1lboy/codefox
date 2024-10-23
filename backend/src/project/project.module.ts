import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './project.model';
import { ProjectPackages } from './project-packages.model';
import { ProjectService } from './project.service';
import { ProjectsResolver } from './project.resolver';
import { AuthModule } from '../auth/auth.module';
import { ProjectGuard } from '../guard/project.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectPackages]),
    AuthModule, // Import AuthModule to provide JwtService to the ProjectGuard
  ],
  providers: [ProjectService, ProjectsResolver, ProjectGuard],
  exports: [ProjectService, ProjectGuard],
})
export class ProjectModule {}
