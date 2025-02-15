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

async function buildAndRunDocker(
  projectPath: string
): Promise<{ domain: string; containerId: string }> {
  console.log(runningContainers);
  if (runningContainers.has(projectPath)) {
    console.log(`Container for project ${projectPath} is already running.`);
    return runningContainers.get(projectPath)!;
  }
  const traefikDomain = process.env.TRAEFIK_DOMAIN || 'docker.localhost';
  const directory = path.join(getProjectPath(projectPath), 'frontend');
  const imageName = path.basename(directory).toLowerCase();
  const containerId = crypto.randomUUID();
  const containerName = `container-${containerId}`;

  const subdomain = projectPath.replace(/[^\w-]/g, '').toLowerCase();
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
            --network=traefik_network -p ${exposedPort}:5173 ${imageName}`;
        console.log(runCommand);

        exec(runCommand, (runErr, runStdout, runStderr) => {
          if (runErr) {
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
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectPath = searchParams.get('projectPath');

  if (!projectPath) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    );
  }

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
  }
}
