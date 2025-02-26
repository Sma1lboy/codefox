import { spawn } from 'child_process';
import { Logger } from '@nestjs/common';

export interface ValidationResult {
  success: boolean;
  error?: string;
}

/**
 * FrontendCodeValidator is responsible for checking the correctness of the generated frontend code.
 * It runs an npm build command (or any custom build script) in the given project directory (frontendPath)
 * and captures any errors produced during the build process.
 */
export class FrontendCodeValidator {
  private readonly logger = new Logger('FrontendCodeValidator');

  /**
   * @param frontendPath - The absolute path to the generated frontend project.
   */
  constructor(private readonly frontendPath: string) {}

  /**
   * Runs the build command (npm run build) inside the frontend project directory.
   * This method returns a promise that resolves with a ValidationResult, indicating whether
   * the build succeeded or failed along with any error messages.
   *
   * @returns A promise that resolves with the ValidationResult.
   */
  public async validate(): Promise<ValidationResult> {
    await this.installDependencies();
    return new Promise<ValidationResult>((resolve, reject) => {
      this.logger.log('Starting frontend code validation...');
      // Spawn the npm build process in the provided frontend project path.
      const npmProcess = spawn('npm', ['run', 'build'], {
        cwd: this.frontendPath,
        shell: true,
      });

      this.logger.log('Running npm build command in', this.frontendPath);
      let stdoutBuffer = '';
      let stderrBuffer = '';

      npmProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        stdoutBuffer += output;
      });

      npmProcess.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        stderrBuffer += output;
      });

      npmProcess.on('close', (code: number) => {
        if (code !== 0) {
          // Build failed – use stderr if available, else fallback to stdout.
          const errorMessage = stderrBuffer || stdoutBuffer;
          this.logger.verbose(
            `Build process exited with code ${code}. Error: ${errorMessage}`,
          );

          // this.logger.error(`Build process exited with code ${code}.`);
          resolve({
            success: false,
            error: errorMessage,
          });
        } else {
          // Build succeeded
          this.logger.log('Build process completed successfully.');
          resolve({
            success: true,
          });
        }
      });

      npmProcess.on('error', (err: Error) => {
        reject(err);
      });
    });
  }

  public async installDependencies(): Promise<ValidationResult> {
    return new Promise<ValidationResult>((resolve, reject) => {
      this.logger.log('Starting npm install in', this.frontendPath);

      const npmInstall = spawn('npm', ['install'], {
        cwd: this.frontendPath,
        shell: true,
      });

      let stdoutBuffer = '';
      let stderrBuffer = '';

      npmInstall.stdout.on('data', (data: Buffer) => {
        stdoutBuffer += data.toString();
      });

      npmInstall.stderr.on('data', (data: Buffer) => {
        stderrBuffer += data.toString();
      });

      npmInstall.on('close', (code: number) => {
        if (code !== 0) {
          const errorMessage = stderrBuffer || stdoutBuffer;
          this.logger.error(`npm install exited with code ${code}.`);
          resolve({
            success: false,
            error: errorMessage,
          });
        } else {
          this.logger.log('npm install completed successfully.');
          resolve({ success: true });
        }
      });

      npmInstall.on('error', (err: Error) => {
        this.logger.error('Failed to run npm install command:', err);
        reject(err);
      });
    });
  }
}
