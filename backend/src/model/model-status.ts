import * as fs from 'fs';
import * as path from 'path';
import { getConfigPath, getModelStatusPath } from 'src/config/common-path';

export interface ModelStatus {
  isDownloaded: boolean;
  lastChecked: Date;
}

export class ModelStatusManager {
  private static instance: ModelStatusManager;
  private status: Record<string, ModelStatus>;
  private readonly statusPath: string;

  private constructor() {
    this.statusPath = getModelStatusPath();
    this.loadStatus();
  }

  public static getInstance(): ModelStatusManager {
    if (!ModelStatusManager.instance) {
      ModelStatusManager.instance = new ModelStatusManager();
    }
    return ModelStatusManager.instance;
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
        {} as Record<string, ModelStatus>,
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

  updateStatus(modelName: string, isDownloaded: boolean) {
    this.status[modelName] = {
      isDownloaded,
      lastChecked: new Date(),
    };
    this.saveStatus();
  }

  getStatus(modelName: string): ModelStatus | null {
    return this.status[modelName] || null;
  }

  getAllStatus(): Record<string, ModelStatus> {
    return { ...this.status };
  }
}
