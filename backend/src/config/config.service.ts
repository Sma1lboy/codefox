import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { EnvironmentVariables } from './env.validation';

@Injectable()
export class AppConfigService {
  constructor(private configService: NestConfigService<EnvironmentVariables>) {}

  get port(): number {
    return this.configService.get('PORT');
  }

  get jwtSecret(): string {
    return this.configService.get('JWT_SECRET');
  }

  get jwtRefresh(): string {
    return this.configService.get('JWT_REFRESH');
  }

  get saltRounds(): number {
    return this.configService.get('SALT_ROUNDS');
  }

  get openaiBaseUri(): string {
    return this.configService.get('OPENAI_BASE_URI');
  }

  // S3 Configuration
  get s3Config() {
    return {
      accessKeyId: this.configService.get('S3_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('S3_SECRET_ACCESS_KEY'),
      region: this.configService.get('S3_REGION'),
      bucketName: this.configService.get('S3_BUCKET_NAME'),
      endpoint: this.configService.get('S3_ENDPOINT'),
    };
  }

  get hasS3Configured(): boolean {
    const config = this.s3Config;
    return !!(config.accessKeyId && config.secretAccessKey && config.region);
  }
}
