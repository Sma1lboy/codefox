import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import * as path from 'path';
import * as net from 'net';
import { getProjectPath } from 'codefox-common';
import puppetter from 'puppeteer';
import { useMutation } from '@apollo/client/react/hooks/useMutation';
import { toast } from 'sonner';
import { UPDATE_PROJECT_PHOTO_URL } from '@/graphql/request';
import { TLS } from '@/utils/const';

const runningContainers = new Map<
  string,
  { domain: string; containerId: string }
>();
const allocatedPorts = new Set<number>();

/**
 * Finds an available port in the given range.
 * It checks each port to see if it's free.
 */
function findAvailablePort(
  minPort: number = 38000,
  maxPort: number = 42000
): Promise<number> {
  return new Promise((resolve, reject) => {
    function checkPort(port: number): Promise<boolean> {
      return new Promise((resolveCheck) => {
        if (allocatedPorts.has(port)) {
          return resolveCheck(false);
        }
        const server = net.createServer();
        server.listen(port, '127.0.0.1', () => {
          server.close(() => resolveCheck(true));
        });
        server.on('error', () => resolveCheck(false));
      });
    }

    async function scanPorts() {
      for (let port = minPort; port <= maxPort; port++) {
        if (await checkPort(port)) {
          allocatedPorts.add(port);
          return resolve(port);
        }
      }
      reject(new Error('No available ports found.'));
    }

    scanPorts();
  });
}

/**
 * Checks if there is already a container running that matches the
 * traefik.http.routers.<subdomain>.rule label.
 */
async function checkExistingContainer(
  projectPath: string
): Promise<string | null> {
  return new Promise((resolve) => {
    const subdomain = projectPath.replace(/[^\w-]/g, '').toLowerCase();
    exec(
      `docker ps --filter "label=traefik.http.routers.${subdomain}.rule" --format "{{.ID}}"`,
      (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve(null);
        } else {
          resolve(stdout.trim());
        }
      }
    );
  });
}

/**
 * Remove local node_modules and lock files before building the Docker image.
 * This is based on Linux/macOS commands. If you are on Windows, you may need
 * to adapt the removal command accordingly.
 */
async function removeNodeModulesAndLockFiles(directory: string) {
  return new Promise<void>((resolve, reject) => {
    // Linux/macOS command. On Windows, you might need a different approach.
    const removeCmd = `rm -rf "${path.join(directory, 'node_modules')}" \
      "${path.join(directory, 'yarn.lock')}" \
      "${path.join(directory, 'package-lock.json')}" \
      "${path.join(directory, 'pnpm-lock.yaml')}"`;

    console.log(`Cleaning up node_modules and lock files in: ${directory}`);
    exec(removeCmd, (err, stdout, stderr) => {
      if (err) {
        console.error('Error removing node_modules or lock files:', stderr);
        return reject(err);
      }
      console.log(`Cleanup done: ${stdout}`);
      resolve();
    });
  });
}

/**
 * Builds and runs a Docker container for the given projectPath.
 * 1. Removes node_modules and lock files
 * 2. Builds the Docker image
 * 3. Runs the container with appropriate labels for Traefik
 */
async function buildAndRunDocker(
  projectPath: string
): Promise<{ domain: string; containerId: string }> {
  const traefikDomain = process.env.TRAEFIK_DOMAIN || 'docker.localhost';

  // Check if a container is already running for this project
  const existingContainerId = await checkExistingContainer(projectPath);
  if (existingContainerId) {
    const subdomain = projectPath.replace(/[^\w-]/g, '').toLowerCase();
    const domain = `${subdomain}.${traefikDomain}`;
    runningContainers.set(projectPath, {
      domain,
      containerId: existingContainerId,
    });
    return { domain, containerId: existingContainerId };
  }

  const directory = path.join(getProjectPath(projectPath), 'frontend');
  const subdomain = projectPath.replace(/[^\w-]/g, '').toLowerCase();
  const imageName = subdomain;
  const containerName = `container-${subdomain}`;
  const domain = `${subdomain}.${traefikDomain}`;
  const exposedPort = await findAvailablePort();

  // 1. Remove node_modules and lock files
  await removeNodeModulesAndLockFiles(directory);

  return new Promise((resolve, reject) => {
    // 2. Build the Docker image
    console.log(
      `Starting Docker build for image: ${imageName} in directory: ${directory}`
    );
    exec(
      `docker build -t ${imageName} ${directory}`,
      (buildErr, buildStdout, buildStderr) => {
        if (buildErr) {
          console.error(`Error during Docker build: ${buildStderr}`);
          return reject(buildErr);
        }

        console.log(`Docker build output:\n${buildStdout}`);
        console.log(`Running Docker container: ${containerName}`);

        // 3. Run the Docker container
        let runCommand;
        if (TLS) {
          runCommand = `docker run -d --name ${containerName} -l "traefik.enable=true" \
          -l "traefik.http.routers.${subdomain}.rule=Host(\\"${domain}\\")" \
          -l "traefik.http.routers.${subdomain}.entrypoints=websecure" \
          -l "traefik.http.routers.${subdomain}.tls=true" \
          -l "traefik.http.services.${subdomain}.loadbalancer.server.port=5173" \
          -l "traefik.http.middlewares.${subdomain}-cors.headers.accessControlAllowOriginList=*" \
          -l "traefik.http.middlewares.${subdomain}-cors.headers.accessControlAllowMethods=GET,POST,PUT,DELETE,OPTIONS" \
          -l "traefik.http.middlewares.${subdomain}-cors.headers.accessControlAllowHeaders=*" \
          -l "traefik.http.routers.${subdomain}.middlewares=${subdomain}-cors" \
          --network=docker_traefik_network  -p ${exposedPort}:5173 \
          -v "${directory}:/app" \
          ${imageName}`;
        } else {
          runCommand = `docker run -d --name ${containerName} -l "traefik.enable=true" \
          -l "traefik.http.routers.${subdomain}.rule=Host(\\"${domain}\\")" \
          -l "traefik.http.routers.${subdomain}.entrypoints=web" \
          -l "traefik.http.services.${subdomain}.loadbalancer.server.port=5173" \
          -l "traefik.http.middlewares.${subdomain}-cors.headers.accessControlAllowOriginList=*" \
          -l "traefik.http.middlewares.${subdomain}-cors.headers.accessControlAllowMethods=GET,POST,PUT,DELETE,OPTIONS" \
          -l "traefik.http.middlewares.${subdomain}-cors.headers.accessControlAllowHeaders=*" \
          -l "traefik.http.routers.${subdomain}.middlewares=${subdomain}-cors" \
          --network=docker_traefik_network  -p ${exposedPort}:5173 \
          -v "${directory}:/app" \
          ${imageName}`;
        }

        console.log(`Executing run command: ${runCommand}`);

        exec(runCommand, (runErr, runStdout, runStderr) => {
          if (runErr) {
            // If the container name already exists
            console.error(`Error during Docker run: ${runStderr}`);
            if (runStderr.includes('Conflict. The container name')) {
              console.log(
                `Container name conflict detected. Removing existing container ${containerName}.`
              );
              // Remove the existing container
              exec(
                `docker rm -f ${containerName}`,
                (removeErr, removeStdout, removeStderr) => {
                  if (removeErr) {
                    console.error(
                      `Error removing existing container: ${removeStderr}`
                    );
                    return reject(removeErr);
                  }
                  console.log(
                    `Existing container ${containerName} removed. Retrying to run the container.`
                  );

                  // Retry running the Docker container
                  exec(
                    runCommand,
                    (retryRunErr, retryRunStdout, retryRunStderr) => {
                      if (retryRunErr) {
                        console.error(
                          `Error during Docker run: ${retryRunStderr}`
                        );
                        return reject(retryRunErr);
                      }

                      const containerActualId = retryRunStdout.trim();
                      runningContainers.set(projectPath, {
                        domain,
                        containerId: containerActualId,
                      });

                      console.log(
                        `Container ${containerName} is now running at http://${domain}`
                      );
                      resolve({ domain, containerId: containerActualId });
                    }
                  );
                }
              );
              return;
            }
            console.error(`Error during Docker run: ${runStderr}`);
            return reject(runErr);
          }

          const containerActualId = runStdout.trim();
          runningContainers.set(projectPath, {
            domain,
            containerId: containerActualId,
          });

          console.log(
            `Container ${containerName} is now running at http://${domain}`
          );
          resolve({ domain, containerId: containerActualId });
        });
      }
    );
  });
}

/**
 * A set to track projects currently being processed,
 * preventing duplicate builds for the same project.
 */
const processingRequests = new Set<string>();

/**
 * GET handler for starting a Docker container.
 * - Checks if projectPath is provided
 * - Checks if a container is already running for that project
 * - If not, triggers buildAndRunDocker
 * - Returns the domain and containerId
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectPath = searchParams.get('projectPath');

  if (!projectPath) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    );
  }

  // Check if a container is already running
  const existingContainer = runningContainers.get(projectPath);
  if (existingContainer) {
    // Check if the container is running
    const containerStatus = await new Promise<string>((resolve) => {
      exec(
        `docker inspect -f "{{.State.Running}}" ${existingContainer.containerId}`,
        (err, stdout) => {
          if (err) {
            resolve('not found');
          } else {
            resolve(stdout.trim());
          }
        }
      );
    });

    if (containerStatus === 'true') {
      return NextResponse.json({
        message: 'Docker container already running',
        domain: existingContainer.domain,
        containerId: existingContainer.containerId,
      });
    } else {
      // Remove the existing container if it's not running
      exec(`docker rm -f ${existingContainer.containerId}`, (removeErr) => {
        if (removeErr) {
          console.error(`Error removing existing container: ${removeErr}`);
        } else {
          console.log(
            `Removed existing container: ${existingContainer.containerId}`
          );
        }
      });
    }
  }

  // Prevent duplicate builds
  if (processingRequests.has(projectPath)) {
    return NextResponse.json({
      message: 'Build in progress',
      status: 'pending',
    });
  }

  processingRequests.add(projectPath);

  try {
    const { domain, containerId } = await buildAndRunDocker(projectPath);

    return NextResponse.json({
      message: 'Docker container started',
      domain,
      containerId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to start Docker container' },
      { status: 500 }
    );
  } finally {
    processingRequests.delete(projectPath);
  }
}
