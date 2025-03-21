// src/github/github-webhook.controller.ts

import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { createNodeMiddleware } from '@octokit/webhooks';
import { GitHubAppService } from './githubApp.service';
import { GetUserIdFromToken } from 'src/decorator/get-auth-token.decorator';
import { UserService } from 'src/user/user.service';

@Controller('github')
export class GitHubWebhookController {
  private readonly webhookMiddleware;

  constructor(private readonly gitHubAppService: GitHubAppService, private readonly userService: UserService) {
    // Get the App instance from the service
    const app = this.gitHubAppService.getApp();

    // Create the Express-style middleware from @octokit/webhooks
    this.webhookMiddleware = createNodeMiddleware(app.webhooks, {
      path: '/github/webhook',
    });
  }

  @Post('webhook')
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    console.log('📩 Received POST /github/webhook');
  
    return this.webhookMiddleware(req, res, (error?: any) => {
      if (error) {
        console.error('⚠️ Webhook middleware error:', error);
        return res.status(500).send('Internal Server Error');
      } else {
        console.log('✅ Middleware processed request');
        return res.sendStatus(200);
      }
    });
  }
  
  @Post('storeInstallation')
  async storeInstallation(
    @Body() body: { installationId: string, githubCode: string },
    @GetUserIdFromToken() userId: string,
  ) {
    await this.userService.bindUserIdAndInstallId(userId, body.installationId, body.githubCode);
    return { success: true };
  }
}
