// GraphQL Resolver for ProjectPackages APIs
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { ProjectPackagesService } from './project-packages.service';
import { ProjectPackages } from './project-packages.model';

@Resolver(() => ProjectPackages)
export class ProjectPackagesResolver {
  constructor(private readonly projectPackagesService: ProjectPackagesService) {}

  @Mutation(() => ProjectPackages)
  async addPackageToProject(
    @Args('projectId') projectId: string,
    @Args('packageContent') packageContent: string
  ): Promise<ProjectPackages> {
    return this.projectPackagesService.addPackageToProject(projectId, packageContent);
  }

  @Mutation(() => Boolean)
  async removePackageFromProject(
    @Args('projectId') projectId: string,
    @Args('packageId') packageId: string
  ): Promise<boolean> {
    return this.projectPackagesService.removePackageFromProject(projectId, packageId);
  }
}
