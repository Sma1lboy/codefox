// src/github/github-webhook.controller.ts

import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { GetUserIdFromToken } from 'src/decorator/get-auth-token.decorator';
import { UserService } from 'src/user/user.service';

@Controller('github')
export class GitHubController {
  private webhooks: any;

  constructor(
    private configService: ConfigService,
    private userService: UserService,
  ) {
    this.initWebhooks();
  }

  private async initWebhooks() {
    const { Webhooks } = await import('@octokit/webhooks');
    this.webhooks = new Webhooks({
      secret: this.configService.get('GITHUB_WEBHOOK_SECRET'),
    });

    this.webhooks.on('push', ({ payload }) => {
      console.log(`📦 Received push event for ${payload.repository.full_name}`);
    });
  }

  // deal GitHub webhook rollbacks
  @Post('webhook')
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    console.log('📩 Received POST /github/webhook');

    // wait webhooks initialize finish
    if (!this.webhooks) {
      return res.status(503).send('Webhook system not ready');
    }

    let rawBody = '';
    req.on('data', (chunk) => {
      rawBody += chunk;
    });

    req.on('end', async () => {
      try {
        const id = req.headers['x-github-delivery'] as string;
        const name = req.headers['x-github-event'] as string;
        const signature = req.headers['x-hub-signature-256'] as string;
        const body = JSON.parse(rawBody);

        await this.webhooks.receive({
          id,
          name,
          payload: body,
          signature,
        });

        return res.sendStatus(200);
      } catch (err) {
        console.error('❌ Error handling webhook:', err);
        return res.status(500).send('Internal Server Error');
      }
    });
  }

  // store GitHub installation info
  @Post('storeInstallation')
  async storeInstallation(
    @Body() body: { installationId: string; githubCode: string },
    @GetUserIdFromToken() userId: string,
  ) {
    await this.userService.bindUserIdAndInstallId(
      userId,
      body.installationId,
      body.githubCode,
    );
    return { success: true };
  }
}
