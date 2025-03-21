// src/github/github-app.service.ts

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { App, Octokit} from 'octokit';
import { readFileSync } from 'fs';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/user.model';
import { Repository } from 'typeorm';

@Injectable()
export class GitHubAppService {
  private readonly logger = new Logger(GitHubAppService.name);

  private readonly app: App;
  //smee -u https://smee.io/asdasd -t http://127.0.0.1:8080/github/webhook
  constructor(
    private configService: ConfigService, 
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    // Load from environment or config
    const appId = this.configService.get('GITHUB_APP_ID');
    const privateKeyPath = this.configService.get('GITHUB_PRIVATE_KEY_PATH');
    const secret = this.configService.get('GITHUB_WEBHOOK_SECRET');
    const enterpriseHostname = this.configService.get('enterpriseHostname') || "";

    // Read the private key from file
    const privateKey = readFileSync(privateKeyPath, 'utf8');

    // Instantiate the GitHub App
    if (enterpriseHostname) {
      // Use custom hostname ONLY if it's non-empty
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

    // Optional: see who you're authenticated as
    this.app.octokit
      .request('/app')
      .then((res) => {
        this.logger.log(`Authenticated as GitHub App: ${res.data.name}`);
      })
      .catch((err) => {
        this.logger.error('Error fetching app info', err);
      });

    this.app.webhooks.on('installation.deleted', async ({ payload }) => {
      this.logger.log(`Received 'installation.deleted' event: installationId=${payload.installation.id}`);
      const installationId = payload.installation.id.toString();

      this.logger.log(`uninstall Created: installationId=${installationId}, GitHub Login=`);

      // remove user github code and installationId 
      await this.userRepo.update(
        { githubInstallationId: installationId }, 
        { githubInstallationId: null,
          githubAccessToken: null
        }
      );

      this.logger.log(`Cleared installationId for user: ${installationId}`);
    });

    // Handle errors
    this.app.webhooks.onError((error) => {
      if (error.name === 'AggregateError') {
        this.logger.error(`Webhook signature verification failed: ${error.event}`);
      } else {
        this.logger.error(error);
      }
    });

    // only for webhooks debugging 
    this.app.webhooks.onAny(async (event) => {
      this.logger.log(`onAny: Received event='${event.name}' action='${event.payload}'`);
    });
  }

  /**
   * Expose a getter so you can retrieve the underlying App instance if needed
   */
  getApp(): App {
    return this.app;
  }
}
