import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Database } from 'sqlite3';

@Injectable()
export class JwtCacheService implements OnModuleInit, OnModuleDestroy {
  private db: Database;
  private readonly logger = new Logger(JwtCacheService.name);

  constructor() {
    this.db = new Database(':memory:');
    this.logger.log('JwtCacheService instantiated');
  }

  async onModuleInit() {
    this.logger.log('Initializing JwtCacheService');
    await this.createTable();
    await this.clearTable();
    this.logger.log('JwtCacheService initialized successfully');
  }

  async onModuleDestroy() {
    this.logger.log('Destroying JwtCacheService');
    await this.clearTable();
    await this.closeDatabase();
    this.logger.log('JwtCacheService destroyed successfully');
  }

  private createTable(): Promise<void> {
    this.logger.debug('Creating jwt_cache table');
    return new Promise((resolve, reject) => {
      this.db.run(
        `
        CREATE TABLE IF NOT EXISTS jwt_cache (
          token TEXT PRIMARY KEY,
          created_at INTEGER NOT NULL
        )
      `,
        (err) => {
          if (err) {
            this.logger.error('Failed to create jwt_cache table', err.stack);
            reject(err);
          } else {
            this.logger.debug('jwt_cache table created successfully');
            resolve();
          }
        },
      );
    });
  }

  private clearTable(): Promise<void> {
    this.logger.debug('Clearing jwt_cache table');
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM jwt_cache', (err) => {
        if (err) {
          this.logger.error('Failed to clear jwt_cache table', err.stack);
          reject(err);
        } else {
          this.logger.debug('jwt_cache table cleared successfully');
          resolve();
        }
      });
    });
  }

  private closeDatabase(): Promise<void> {
    this.logger.debug('Closing database connection');
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          this.logger.error('Failed to close database connection', err.stack);
          reject(err);
        } else {
          this.logger.debug('Database connection closed successfully');
          resolve();
        }
      });
    });
  }

  async storeToken(token: string): Promise<void> {
    this.logger.debug(`Storing token: ${token.substring(0, 10)}...`);
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT OR REPLACE INTO jwt_cache (token, created_at) VALUES (?, ?)',
        [token, Date.now()],
        (err) => {
          if (err) {
            this.logger.error('Failed to store token', err.stack);
            reject(err);
          } else {
            this.logger.debug('Token stored successfully');
            resolve();
          }
        },
      );
    });
  }

  async isTokenStored(token: string): Promise<boolean> {
    this.logger.debug(
      `Checking if token is stored: ${token.substring(0, 10)}...`,
    );
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT token FROM jwt_cache WHERE token = ?',
        [token],
        (err, row) => {
          if (err) {
            this.logger.error('Failed to check token', err.stack);
            reject(err);
          } else {
            const isStored = !!row;
            this.logger.debug(`Token ${isStored ? 'is' : 'is not'} stored`);
            resolve(isStored);
          }
        },
      );
    });
  }

  async removeToken(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM jwt_cache WHERE token = ?', [token], (err) => {
        if (err) {
          this.logger.error('Failed to remove token', err.stack);
          reject(err);
        } else {
          this.logger.debug('Token removed successfully');
          resolve();
        }
      });
    });
  }
}
