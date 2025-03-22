import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/user.model';
import { Repository } from 'typeorm';
import { Project } from 'src/project/project.model';

@Injectable()
export class GitHubAppService {
  private readonly logger = new Logger(GitHubAppService.name);
  private app: any;

  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {
    // use constructor to initialize the app
    this.initApp();
  }

  private async initApp() {
    // dynamic import fix eslint error
    const { App, Octokit } = await import('octokit');

    const appId = this.configService.get('GITHUB_APP_ID');
    const privateKeyPath = this.configService.get('GITHUB_PRIVATE_KEY_PATH');
    const secret = this.configService.get('GITHUB_WEBHOOK_SECRET');
    const enterpriseHostname =
      this.configService.get('enterpriseHostname') || '';

    const privateKey = readFileSync(privateKeyPath, 'utf8');

    if (enterpriseHostname) {
      this.app = new App({
        appId,
        privateKey,
        webhooks: { secret },
        Octokit: Octokit.defaults({
          baseUrl: `https://${enterpriseHostname}/api/v3`,
        }),
      });
    } else {
      this.app = new App({
        appId,
        privateKey,
        webhooks: { secret },
      });
    }

    this.app.octokit
      .request('/app')
      .then((res) => {
        this.logger.log(`Authenticated as GitHub App: ${res.data.name}`);
      })
      .catch((err) => {
        this.logger.error('Error fetching app info', err);
      });

    this.app.webhooks.on('installation.deleted', async ({ payload }) => {
      const installationId = payload.installation.id.toString();
      await this.userRepo.update(
        { githubInstallationId: installationId },
        { githubInstallationId: null, githubAccessToken: null },
      );
      this.logger.log(`Cleared installationId for user: ${installationId}`);
    });

    this.app.webhooks.on('installation_repositories', async ({ payload }) => {
      const removedRepos = payload.repositories_removed;
      if (!removedRepos || removedRepos.length === 0) return;

      for (const repo of removedRepos) {
        const repoName = repo.name;
        const repoOwner = payload.installation.account.name;

        const project = await this.projectRepo.findOne({
          where: {
            githubRepoName: repoName,
            githubOwner: repoOwner,
          },
        });

        if (!project) continue;

        project.isSyncedWithGitHub = false;
        project.githubRepoName = null;
        project.githubRepoUrl = null;
        project.githubOwner = null;

        await this.projectRepo.save(project);
      }
    });

    this.app.webhooks.onError((error) => {
      if (error.name === 'AggregateError') {
        this.logger.error(`Webhook signature verification failed: ${error.event}`);
      } else {
        this.logger.error(error);
      }
    });

    this.app.webhooks.onAny(async (event) => {
      this.logger.log(`onAny: Received event='${event.name}' action='${event.payload}'`);
    });
  }

  getApp() {
    return this.app;
  }
}
