import { getModelStatusPath } from 'codefox-common';
import * as fs from 'fs';
import * as path from 'path';

export interface UniversalStatus {
  isDownloaded: boolean;
  lastChecked: Date;
}

export class UniversalStatusManager {
  private static instance: UniversalStatusManager;
  private status: Record<string, UniversalStatus>;
  private readonly statusPath: string;

  private constructor() {
    this.statusPath = getModelStatusPath();
    this.loadStatus();
  }

  public static getInstance(): UniversalStatusManager {
    if (!UniversalStatusManager.instance) {
      UniversalStatusManager.instance = new UniversalStatusManager();
    }
    return UniversalStatusManager.instance;
  }

  private loadStatus() {
    try {
      const file = fs.readFileSync(this.statusPath, 'utf-8');
      const data = JSON.parse(file);
      this.status = Object.entries(data).reduce(
        (acc, [key, value]: [string, any]) => {
          acc[key] = {
            ...value,
            lastChecked: value.lastChecked
              ? new Date(value.lastChecked)
              : new Date(),
          };
          return acc;
        },
        {} as Record<string, UniversalStatus>,
      );
    } catch (error) {
      this.status = {};
    }
  }

  private saveStatus() {
    const statusDir = path.dirname(this.statusPath);
    if (!fs.existsSync(statusDir)) {
      fs.mkdirSync(statusDir, { recursive: true });
    }
    fs.writeFileSync(
      this.statusPath,
      JSON.stringify(this.status, null, 2),
      'utf-8',
    );
  }

  updateStatus(UniversalName: string, isDownloaded: boolean) {
    this.status[UniversalName] = {
      isDownloaded,
      lastChecked: new Date(),
    };
    this.saveStatus();
  }

  getStatus(UniversalName: string): UniversalStatus | undefined {
    return this.status[UniversalName];
  }

  getAllStatus(): Record<string, UniversalStatus> {
    return { ...this.status };
  }
}
