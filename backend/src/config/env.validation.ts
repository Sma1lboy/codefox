import { IsString, IsOptional, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class EnvironmentVariables {
  @IsNumber()
  @Transform(({ value }) => Number(value))
  PORT: number;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_REFRESH: string;

  @IsNumber()
  @Transform(({ value }) => Number(value))
  SALT_ROUNDS: number;

  @IsString()
  OPENAI_BASE_URI: string;

  // S3 Configuration
  @IsOptional()
  @IsString()
  S3_ACCESS_KEY_ID?: string;

  @IsOptional()
  @IsString()
  S3_SECRET_ACCESS_KEY?: string;

  @IsOptional()
  @IsString()
  S3_REGION?: string;

  @IsOptional()
  @IsString()
  S3_BUCKET_NAME?: string;

  @IsOptional()
  @IsString()
  S3_ENDPOINT?: string;
}
