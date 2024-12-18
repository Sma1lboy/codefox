import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PROJECT_EVENT_PATH } from 'src/config/common-path';

export interface ProjectEvent {
  timestamp: string;
  projectId: string;
  eventId: string;
  type: 'BUILD_START' | 'BUILD_END' | 'BUILD_ERROR' | 'BUILD_METRICS';
  data: any;
}

export class ProjectEventLogger {
  private static instance: ProjectEventLogger;
  private logger: Logger;
  private constructor() {
    this.logger = new Logger('ProjectEventLogger');
    this.ensureDirectoryExists();
  }

  static getInstance(): ProjectEventLogger {
    if (!ProjectEventLogger.instance) {
      ProjectEventLogger.instance = new ProjectEventLogger();
    }
    return ProjectEventLogger.instance;
  }

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(PROJECT_EVENT_PATH)) {
      fs.mkdirSync(PROJECT_EVENT_PATH, { recursive: true });
    }
  }

  private getLogFilePath(): string {
    // get current server date as standard log date format
    const today = new Date().toISOString().split('T')[0];
    return path.join(PROJECT_EVENT_PATH, `${today}.json`);
  }

  private async readExistingEvents(): Promise<ProjectEvent[]> {
    const filePath = this.getLogFilePath();
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const content = await fs.promises.readFile(filePath, 'utf8');
    return content ? JSON.parse(content) : [];
  }

  async logEvent(event: ProjectEvent): Promise<void> {
    try {
      const filePath = this.getLogFilePath();
      const events = await this.readExistingEvents();
      events.push(event);
      await fs.promises.writeFile(filePath, JSON.stringify(events, null, 2));
      this.logger.log(`Event logged: ${event.type}`);
    } catch (error) {
      this.logger.error('Failed to log event:', error);
      throw error;
    }
  }
}
