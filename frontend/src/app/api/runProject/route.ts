import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import * as path from 'path';
import * as crypto from 'crypto';
import * as net from 'net';
import { getProjectPath } from 'codefox-common';

const runningContainers = new Map<
  string,
  { domain: string; containerId: string }
>();
const allocatedPorts = new Set<number>();

function findAvailablePort(
  minPort: number = 38000,
  maxPort: number = 42000
): Promise<number> {
  return new Promise((resolve, reject) => {
    function checkPort(port: number): Promise<boolean> {
      return new Promise((resolve) => {
        if (allocatedPorts.has(port)) {
          return resolve(false);
        }
        const server = net.createServer();
        server.listen(port, '127.0.0.1', () => {
          server.close(() => resolve(true));
        });
        server.on('error', () => resolve(false));
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

async function buildAndRunDocker(
  projectPath: string
): Promise<{ domain: string; containerId: string }> {
  const traefikDomain = process.env.TRAEFIK_DOMAIN || 'docker.localhost';

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
  return new Promise((resolve, reject) => {
    exec(
      `docker build -t ${imageName} ${directory}`,
      (buildErr, buildStdout, buildStderr) => {
        if (buildErr) {
          console.error(`Error during Docker build: ${buildStderr}`);
          return reject(buildErr);
        }

        console.log(`Docker build output:\n${buildStdout}`);
        console.log(`Running Docker container: ${containerName}`);

        const runCommand = `docker run -d --name ${containerName} -l "traefik.enable=true" \
            -l "traefik.http.routers.${subdomain}.rule=Host(\\"${domain}\\")" \
            -l "traefik.http.services.${subdomain}.loadbalancer.server.port=5173" \
            --network=traefik_network -p ${exposedPort}:5173 \
            -v "${directory}:/app" \
            ${imageName}`;
        console.log(runCommand);

        exec(runCommand, (runErr, runStdout, runStderr) => {
          if (runErr) {
            // Check if error is due to container already existing
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
const processingRequests = new Set<string>();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectPath = searchParams.get('projectPath');

  if (!projectPath) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    );
  }

  // First check if container is already running
  const existingContainer = runningContainers.get(projectPath);
  if (existingContainer) {
    return NextResponse.json({
      message: 'Docker container already running',
      domain: existingContainer.domain,
      containerId: existingContainer.containerId,
    });
  }

  // If already processing this project, don't start another build
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
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to start Docker container' },
      { status: 500 }
    );
  } finally {
    processingRequests.delete(projectPath);
  }
}
