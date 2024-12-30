import * as fs from 'fs';
import * as path from 'path';
import { getModelStatusPath } from 'src/config/common-path';
  
export interface UniversalStatus {
  isDownloaded: boolean;
  lastChecked: Date;
}

export class UniversalStatusManager {
  private static instances: Map<string, UniversalStatusManager> = new Map();
  private status: Record<string, UniversalStatus>;
  private readonly statusPath: string;

  private constructor() {
    this.statusPath = getModelStatusPath();
    this.loadStatus();
  }

  public static getInstance(type: string): UniversalStatusManager {
    if (!UniversalStatusManager.instances.has(type)) {
      UniversalStatusManager.instances.set(type, new UniversalStatusManager());
    }
    return UniversalStatusManager.instances.get(type)!;
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
