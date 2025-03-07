import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import * as path from 'path';
import * as net from 'net';
import * as fs from 'fs';
import { getProjectPath } from 'codefox-common';
import { useMutation } from '@apollo/client/react/hooks/useMutation';
import { toast } from 'sonner';
import { UPDATE_PROJECT_PHOTO_URL } from '@/graphql/request';
import { TLS } from '@/utils/const';
import os from 'os';

const isWindows = os.platform() === 'win32';
import { URL_PROTOCOL_PREFIX } from '@/utils/const';

// Persist container state to file system to recover after service restarts
const CONTAINER_STATE_FILE = path.join(process.cwd(), 'container-state.json');
const PORT_STATE_FILE = path.join(process.cwd(), 'port-state.json');

// In-memory container and port state
let runningContainers = new Map<
  string,
  { domain: string; containerId: string; port?: number; timestamp: number }
>();
let allocatedPorts = new Set<number>();

// Set to track projects being processed
const processingRequests = new Set<string>();

// State lock to prevent concurrent reads/writes to state files
let isUpdatingState = false;

/**
 * Initialize function, loads persisted state when service starts
 */
async function initializeState() {
  try {
    // Load container state
    if (fs.existsSync(CONTAINER_STATE_FILE)) {
      const containerData = await fs.promises.readFile(
        CONTAINER_STATE_FILE,
        'utf8'
      );
      const containerMap = JSON.parse(containerData);
      runningContainers = new Map(Object.entries(containerMap));

      // Verify each container is still running
      for (const [projectPath, container] of Array.from(
        runningContainers.entries()
      )) {
        const isRunning = await checkContainerRunning(container.containerId);
        if (!isRunning) {
          runningContainers.delete(projectPath);
        }
      }
    }

    // Load port state
    if (fs.existsSync(PORT_STATE_FILE)) {
      const portData = await fs.promises.readFile(PORT_STATE_FILE, 'utf8');
      const ports = JSON.parse(portData);
      allocatedPorts = new Set(ports);

      // Clear expired port allocations (older than 24 hours)
      const currentTime = Date.now();
      const containers = Array.from(runningContainers.values());
      const validPorts = new Set<number>();

      // Only retain ports used by currently running containers
      containers.forEach((container) => {
        if (
          container.port &&
          currentTime - container.timestamp < 24 * 60 * 60 * 1000
        ) {
          validPorts.add(container.port);
        }
      });

      allocatedPorts = validPorts;
    }

    // Save cleaned-up state
    await saveState();

    console.log(
      'State initialization complete, cleaned up non-running containers and expired port allocations'
    );
  } catch (error) {
    console.error('Error initializing state:', error);
    // If loading fails, continue with empty state
    runningContainers = new Map();
    allocatedPorts = new Set();
  }
}

/**
 * Save current state to file system
 */
async function saveState() {
  if (isUpdatingState) {
    // If an update is already in progress, wait
    await new Promise((resolve) => setTimeout(resolve, 100));
    return saveState();
  }

  isUpdatingState = true;
  try {
    // Save container state
    const containerObject = Object.fromEntries(runningContainers);
    await fs.promises.writeFile(
      CONTAINER_STATE_FILE,
      JSON.stringify(containerObject, null, 2)
    );

    // Save port state
    const portsArray = Array.from(allocatedPorts);
    await fs.promises.writeFile(
      PORT_STATE_FILE,
      JSON.stringify(portsArray, null, 2)
    );
  } catch (error) {
    console.error('Error saving state:', error);
  } finally {
    isUpdatingState = false;
  }
}

/**
 * Find an available port
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
      // Add randomness to avoid sequential port allocation
      const portRange = Array.from(
        { length: maxPort - minPort + 1 },
        (_, i) => i + minPort
      );
      const shuffledPorts = portRange.sort(() => Math.random() - 0.5);

      for (const port of shuffledPorts) {
        if (await checkPort(port)) {
          allocatedPorts.add(port);
          await saveState();
          return resolve(port);
        }
      }
      reject(new Error('No available ports found'));
    }

    scanPorts();
  });
}

/**
 * Check if a container is still running
 */
function checkContainerRunning(containerId: string): Promise<boolean> {
  return new Promise((resolve) => {
    exec(
      `docker inspect -f "{{.State.Running}}" ${containerId}`,
      (err, stdout) => {
        if (err || stdout.trim() !== 'true') {
          resolve(false);
        } else {
          resolve(true);
        }
      }
    );
  });
}

/**
 * Check if there's already a container running with the specified label
 */
async function checkExistingContainer(
  projectPath: string
): Promise<string | null> {
  return new Promise((resolve) => {
    const subdomain = projectPath.replace(/[^\w-]/g, '').toLowerCase();
    exec(
      `docker ps --filter "label=traefik.http.routers.${subdomain}.rule" --format "{{.ID}}"`,
      { timeout: 10000 }, // Set timeout to prevent command hanging
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
 * Remove node_modules and lock files
 */
async function removeNodeModulesAndLockFiles(directory: string) {
  return new Promise<void>((resolve, reject) => {
    const removeCmd = `rm -rf "${path.join(directory, 'node_modules')}" \
      "${path.join(directory, 'yarn.lock')}" \
      "${path.join(directory, 'package-lock.json')}" \
      "${path.join(directory, 'pnpm-lock.yaml')}"`;

    console.log(`Cleaning up node_modules and lock files in: ${directory}`);
    exec(removeCmd, { timeout: 30000 }, (err, stdout, stderr) => {
      if (err) {
        console.error('Error removing node_modules or lock files:', stderr);
        // Don't block the process, continue even if cleanup fails
        resolve();
        return;
      }
      console.log(`Cleanup done: ${stdout}`);
      resolve();
    });
  });
}

/**
 * Execute Docker command with timeout and retry logic
 */
function execWithTimeout(
  command: string,
  options: { timeout: number; retries?: number } = {
    timeout: 60000,
    retries: 2,
  }
): Promise<string> {
  let retryCount = 0;
  const maxRetries = options.retries || 0;

  const executeWithRetry = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      console.log(`Executing command: ${command}`);
      exec(command, { timeout: options.timeout }, (error, stdout, stderr) => {
        if (error) {
          console.error(`Command execution error: ${stderr}`);
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Retry ${retryCount}/${maxRetries}`);
            setTimeout(() => {
              executeWithRetry().then(resolve).catch(reject);
            }, 2000); // Wait 2 seconds before retry
          } else {
            reject(new Error(`${error.message}\n${stderr}`));
          }
        } else {
          resolve(stdout.trim());
        }
      });
    });
  };

  return executeWithRetry();
}

/**
 * Build and run Docker container
 */
async function buildAndRunDocker(
  projectPath: string
): Promise<{ domain: string; containerId: string; port: number }> {
  const traefikDomain = process.env.TRAEFIK_DOMAIN || 'docker.localhost';

  // Check for existing container
  const existingContainerId = await checkExistingContainer(projectPath);
  if (existingContainerId) {
    // Verify container is running
    const isRunning = await checkContainerRunning(existingContainerId);
    if (isRunning) {
      const subdomain = projectPath.replace(/[^\w-]/g, '').toLowerCase();
      const domain = `${subdomain}.${traefikDomain}`;
      const containerInfo = runningContainers.get(projectPath);
      const port = containerInfo?.port || 0;

      // Update container state
      runningContainers.set(projectPath, {
        domain,
        containerId: existingContainerId,
        port,
        timestamp: Date.now(),
      });
      await saveState();

      return { domain, containerId: existingContainerId, port };
    }

    // If container is no longer running, try to remove it
    try {
      await execWithTimeout(`docker rm -f ${existingContainerId}`, {
        timeout: 30000,
      });
      console.log(`Removed non-running container: ${existingContainerId}`);
    } catch (error) {
      console.error(`Error removing non-running container:`, error);
      // Continue processing even if removal fails
    }
  }

  const directory = path.join(getProjectPath(projectPath), 'frontend');
  const subdomain = projectPath.replace(/[^\w-]/g, '').toLowerCase();
  const imageName = subdomain;
  const containerName = `container-${subdomain}`;
  const domain = `${subdomain}.${traefikDomain}`;

  // Allocate port
  const exposedPort = await findAvailablePort();

  // Remove node_modules and lock files
  try {
    await removeNodeModulesAndLockFiles(directory);
  } catch (error) {
    console.error(
      'Error during cleanup phase, but will continue with build:',
      error
    );
  }

  try {
    // Check if a container with the same name already exists, remove it if found
    try {
      await execWithTimeout(`docker inspect ${containerName}`, {
        timeout: 10000,
      });
      console.log(
        `Found container with same name ${containerName}, removing it first`
      );
      await execWithTimeout(`docker rm -f ${containerName}`, {
        timeout: 20000,
      });
    } catch (error) {
      // If container doesn't exist, this will error out which is expected
    }

    // Build Docker image
    console.log(
      `Starting Docker build for image: ${imageName} in directory: ${directory}`
    );
    await execWithTimeout(
      `docker build -t ${imageName} ${directory}`,
      { timeout: 300000, retries: 1 } // 5 minutes timeout, 1 retry
    );

    // Determine whether to use TLS or non-TLS configuration
    const TLS = process.env.TLS === 'true';

    // Configure Docker run command
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
      --network=docker_traefik_network -p ${exposedPort}:5173 \
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
      --network=docker_traefik_network -p ${exposedPort}:5173 \
      -v "${directory}:/app" \
      ${imageName}`;
    }

    // Run container
    console.log(`Executing run command: ${runCommand}`);
    const containerActualId = await execWithTimeout(
      runCommand,
      { timeout: 60000, retries: 2 } // 1 minute timeout, 2 retries
    );

    // Verify container started successfully
    const containerStatus = await execWithTimeout(
      `docker inspect -f "{{.State.Running}}" ${containerActualId}`,
      { timeout: 10000 }
    );

    if (containerStatus !== 'true') {
      throw new Error(`Container failed to start, status: ${containerStatus}`);
    }

    // Update container state
    runningContainers.set(projectPath, {
      domain,
      containerId: containerActualId,
      port: exposedPort,
      timestamp: Date.now(),
    });
    await saveState();

    console.log(
      `Container ${containerName} is now running at ${URL_PROTOCOL_PREFIX}://${domain} (port: ${exposedPort})`
    );
    return { domain, containerId: containerActualId, port: exposedPort };
  } catch (error: any) {
    console.error(`Error building or running container:`, error);

    // Clean up allocated port
    allocatedPorts.delete(exposedPort);
    await saveState();

    throw error;
  }
}

// Initialize state when service starts
initializeState().catch((error) => {
  console.error('Error initializing state:', error);
});

// Periodically check container status (hourly)
setInterval(
  async () => {
    const projectPaths = Array.from(runningContainers.keys());

    for (const projectPath of projectPaths) {
      const container = runningContainers.get(projectPath);
      if (!container) continue;

      const isRunning = await checkContainerRunning(container.containerId);
      if (!isRunning) {
        console.log(
          `Container ${container.containerId} is no longer running, removing from state`
        );
        runningContainers.delete(projectPath);
        if (container.port) {
          allocatedPorts.delete(container.port);
        }
      }
    }

    await saveState();
  },
  60 * 60 * 1000
);

/**
 * GET request handler for starting a Docker container
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
    // Verify container is still running
    const isRunning = await checkContainerRunning(
      existingContainer.containerId
    );
    if (isRunning) {
      return NextResponse.json({
        message: 'Docker container already running',
        domain: existingContainer.domain,
        containerId: existingContainer.containerId,
      });
    } else {
      // Remove non-running container from state
      runningContainers.delete(projectPath);
      if (existingContainer.port) {
        allocatedPorts.delete(existingContainer.port);
      }
      await saveState();

      console.log(
        `Container ${existingContainer.containerId} is no longer running, will create a new one`
      );
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
    console.error(`Failed to start Docker container:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to start Docker container' },
      { status: 500 }
    );
  } finally {
    processingRequests.delete(projectPath);
  }
}
