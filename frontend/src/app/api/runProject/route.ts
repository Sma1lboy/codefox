import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import * as path from 'path';
import * as net from 'net';
import { getProjectPath } from 'codefox-common';

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
        const runCommand = `docker run -d --name ${containerName} -l "traefik.enable=true" \
            -l "traefik.http.routers.${subdomain}.rule=Host(\\"${domain}\\")" \
            -l "traefik.http.services.${subdomain}.loadbalancer.server.port=5173" \
            --network=codefox_traefik_network -p ${exposedPort}:5173 \
            -v "${directory}:/app" \
            ${imageName}`;

        console.log(runCommand);

        exec(runCommand, (runErr, runStdout, runStderr) => {
          if (runErr) {
            // If the container name already exists
            if (runStderr.includes('Conflict. The container name')) {
              resolve({ domain, containerId: containerName });
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
    return NextResponse.json({
      message: 'Docker container already running',
      domain: existingContainer.domain,
      containerId: existingContainer.containerId,
    });
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
