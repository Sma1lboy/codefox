import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Projects } from './project.model';
import { ProjectPackages } from './project-packages.model';

@Module({
  imports: [TypeOrmModule.forFeature([Projects, ProjectPackages])],
  // providers: [ProjectService],
  // exports: [ProjectService],
})
export class ProjectModule {}
