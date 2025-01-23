import * as path from 'path';
import {
  existsSync,
  mkdirSync,
  promises as fsPromises,
  readFileSync,
  copyFileSync,
} from 'fs-extra';
import pacote from 'pacote';
import { Logger } from '@nestjs/common';
import { ChromaClient, Collection } from 'chromadb';
import { getTempDir } from 'codefox-common';
import { parseFileToDocuments } from './utils';
import { PackageDocument, PackageInfo } from './types';

const logger = new Logger('dependencies-embedding-handler');

/**
 * Class responsible for handling dependencies and their embeddings.
 * It manages packages, downloads their contents, generates embeddings,
 * and provides search functionality based on those embeddings.
 */
export class DependenciesEmbeddingHandler {
  private packages: Map<string, PackageInfo>;

  private initialized: boolean;

  private initPromise: Promise<void>;
  private chroma: ChromaClient;
  private collection: Collection;

  /**
   * Constructor initializes the packages map, embedding model,
   * and starts the initialization process for the embedding model.
   */
  constructor() {
    this.packages = new Map();
    this.initialized = false;

    this.chroma = new ChromaClient({ path: 'http://localhost:8000' });
    this.initPromise = this.initialize();
  }

  /**
   * Initializes the embedding model by calling the asynchronous init method
   * from the FlagEmbedding class. Sets the initialized flag to true upon success.
   * If initialization fails, logs the error and rethrows it.
   */
  private async initialize() {
    try {
      this.collection = await this.chroma.getOrCreateCollection({
        name: 'packages-embedding',
      });

      this.initialized = true;
      logger.log('Embedding model initialized successfully.');
    } catch (error) {
      // Log the error if initialization fails and rethrow it.
      logger.error('Failed to initialize embedding model:', error);
      throw error;
    }
  }

  /**
   * Ensures that the embedding model has been initialized before proceeding.
   * If not initialized, waits for the initialization promise to resolve.
   */
  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initPromise;
    }
  }

  /**
   * Downloads and extracts an npm package to a temporary directory.
   *
   * @param packageName - The name of the package to download.
   * @param version - The version of the package to download.
   * @returns The path to the extracted package directory.
   * @throws Will throw an error if the package cannot be downloaded or extracted.
   */
  private async downloadAndExtractPackage(
    packageName: string,
    version: string,
  ): Promise<string> {
    // Define the base directory for temporary packages
    const tempPackagesBaseDir = path.join(getTempDir(), 'temp-packages');

    // Define the specific directory for this package version
    const packageDir = path.join(tempPackagesBaseDir, packageName, version);

    // Prevent re-downloading if the package already exists
    if (existsSync(packageDir)) {
      logger.log(
        `Package ${packageName}@${version} already exists at ${packageDir}`,
      );

      // Step 1: Check for TypeScript files in the existing package
      const tsFiles = await this.readTypeScriptFiles(packageDir);
      if (tsFiles.length === 0) {
        logger.log(
          `No TypeScript files found in ${packageName}@${version}. Checking for @types/${packageName}@${version}...`,
        );

        // Define the @types package name
        const typesPackageName = `@types/${packageName}`;

        // Define the directory for the @types package
        const typesPackageDir = path.join(
          tempPackagesBaseDir,
          typesPackageName,
          version,
        );

        // Check if the @types package already exists
        if (existsSync(typesPackageDir)) {
          logger.log(
            `@types/${packageName}@${version} already exists at ${typesPackageDir}`,
          );
        } else {
          try {
            logger.log(`Downloading @types/${packageName}@${version}...`);

            // Ensure the @types package directory exists
            mkdirSync(typesPackageDir, { recursive: true });

            // Fetch and extract the @types package tarball to the types package directory
            // FIXME: @type package verison may different then package version
            await pacote.extract(`${typesPackageName}`, typesPackageDir, {
              cache: undefined,
              // Remove the top-level 'package/' directory from the tarball
              strip: 1,
            });

            logger.log(
              `@types/${packageName}@${version} downloaded and extracted to ${typesPackageDir}`,
            );
          } catch (typesError: any) {
            logger.error(
              `Failed to download and extract @types/${packageName}@${version}:`,
              typesError,
            );
            // Depending on your requirements, you can choose to throw an error or continue without type definitions
            throw new Error(
              `Failed to download and extract @types/${packageName}@${version}: ${typesError.message}`,
            );
          }
        }

        // Step 2: Check for TypeScript files in the @types package
        const typesTsFiles = await this.readTypeScriptFiles(typesPackageDir);
        if (typesTsFiles.length === 0) {
          logger.warn(
            `No TypeScript files found in @types/${packageName}@${version} either.`,
          );
          // Proceed without type definitions or handle accordingly
        } else {
          logger.log(
            `Found ${typesTsFiles.length} TypeScript files in @types/${packageName}@${version}`,
          );
          // Example: Merge TypeScript files from @types into the original package directory
          for (const file of typesTsFiles) {
            const relativePath = path.relative(typesPackageDir, file);
            const targetPath = path.join(packageDir, relativePath);

            // Ensure the target directory exists
            mkdirSync(path.dirname(targetPath), { recursive: true });

            // Copy the TypeScript file
            copyFileSync(file, targetPath);
            logger.log(`Merged type definition file: ${targetPath}`);
          }
        }
      } else {
        // Package directory exists and has TypeScript files
        logger.log(
          `Found ${tsFiles.length} TypeScript files in ${packageName}@${version}`,
        );
      }

      return packageDir;
    }

    try {
      logger.log(`Downloading package ${packageName}@${version}...`);

      // Ensure the package directory exists
      mkdirSync(packageDir, { recursive: true });

      // Fetch and extract the package tarball to the package directory
      await pacote.extract(`${packageName}@${version}`, packageDir, {
        cache: undefined,
        // Remove the top-level 'package/' directory from the tarball
        strip: 1,
      });

      logger.log(
        `Package ${packageName}@${version} downloaded and extracted to ${packageDir}`,
      );

      // Step 1: Check for TypeScript files in the extracted package
      const tsFiles = await this.readTypeScriptFiles(packageDir);
      if (tsFiles.length === 0) {
        logger.log(
          `No TypeScript files found in ${packageName}@${version}. Attempting to download @types/${packageName}@${version}...`,
        );

        // Define the @types package name
        const typesPackageName = `@types/${packageName}`;

        // Define the directory for the @types package
        const typesPackageDir = path.join(
          tempPackagesBaseDir,
          typesPackageName,
          version,
        );

        // Prevent re-downloading if the @types package already exists
        if (existsSync(typesPackageDir)) {
          logger.log(
            `@types/${packageName}@${version} already exists at ${typesPackageDir}`,
          );
        } else {
          try {
            logger.log(`Downloading @types/${packageName}@${version}...`);

            // Ensure the @types package directory exists
            mkdirSync(typesPackageDir, { recursive: true });

            // Fetch and extract the @types package tarball to the types package directory
            // FIXME: type version might different then package version
            await pacote.extract(`${typesPackageName}`, typesPackageDir, {
              cache: undefined,
              strip: 1,
            });

            logger.log(
              `@types/${packageName}@${version} downloaded and extracted to ${typesPackageDir}`,
            );
          } catch (typesError: any) {
            logger.error(
              `Failed to download and extract @types/${packageName}@${version}:`,
              typesError,
            );
            // Depending on your requirements, you can choose to throw an error or continue without type definitions
            throw new Error(
              `Failed to download and extract @types/${packageName}@${version}: ${typesError.message}`,
            );
          }
        }

        // Step 2: Check for TypeScript files in the @types package
        const typesTsFiles = await this.readTypeScriptFiles(typesPackageDir);
        if (typesTsFiles.length === 0) {
          logger.warn(
            `No TypeScript files found in @types/${packageName}@${version} either.`,
          );
          // Proceed without type definitions or handle accordingly
        } else {
          logger.log(
            `Found ${typesTsFiles.length} TypeScript files in @types/${packageName}@${version}`,
          );
          // Example: Merge TypeScript files from @types into the original package directory
          for (const file of typesTsFiles) {
            const relativePath = path.relative(typesPackageDir, file);
            const targetPath = path.join(packageDir, relativePath);

            // Ensure the target directory exists
            mkdirSync(path.dirname(targetPath), { recursive: true });

            // Copy the TypeScript file
            copyFileSync(file, targetPath);
            logger.log(`Merged type definition file: ${targetPath}`);
          }
        }
      } else {
        logger.log(
          `Found ${tsFiles.length} TypeScript files in ${packageName}@${version}`,
        );
      }

      return packageDir;
    } catch (error: any) {
      logger.error(
        `Failed to download and extract package ${packageName}@${version}:`,
        error,
      );
      throw new Error(
        `Failed to download and extract package ${packageName}@${version}: ${error.message}`,
      );
    }
  }
  /**
   * Recursively reads all TypeScript and declaration files in a directory.
   *
   * @param dir - The directory to read.
   * @returns An array of file paths matching TypeScript and declaration files.
   */
  private async readTypeScriptFiles(dir: string): Promise<string[]> {
    const tsFiles: string[] = [];

    const traverseDir = async (currentDir: string) => {
      const entries = await fsPromises.readdir(currentDir, {
        withFileTypes: true,
      });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          await traverseDir(fullPath);
        } else if (
          entry.isFile() &&
          (entry.name.endsWith('.ts') || entry.name.endsWith('.d.ts'))
        ) {
          tsFiles.push(fullPath);
        }
      }
    };

    try {
      await traverseDir(dir);
      logger.log(
        `Found ${tsFiles.length} TypeScript files in directory ${dir}`,
      );
      return tsFiles;
    } catch (error) {
      logger.error(
        `Error reading TypeScript files in directory ${dir}:`,
        error,
      );
      throw new Error(
        `Failed to read TypeScript files in directory ${dir}: ${error.message}`,
      );
    }
  }

  /**
   * Adds a single package to the handler by fetching its type definitions,
   * generating an embedding, and storing the package information.
   *
   * @param name - The name of the package to add.
   * @param version - The version of the package to add.
   * @throws Will throw an error if embedding generation fails.
   */
  async addPackage(name: string, version: string): Promise<void> {
    await this.ensureInitialized();

    try {
      const packageDir = await this.downloadAndExtractPackage(name, version);
      const files = await this.readAllFiles(packageDir);

      for (const file of files) {
        if (file.endsWith('.js') || file.endsWith('.ts')) {
          const content = readFileSync(file, 'utf-8');
          const documents = await parseFileToDocuments(
            file,
            content,
            name,
            version,
          );
          const existingIds = new Set<string>();
          const uniqueDocuments = documents.reduce((acc, doc) => {
            if (!existingIds.has(doc.id)) {
              existingIds.add(doc.id);
              acc.push(doc);
            }
            return acc;
          }, [] as PackageDocument[]);
          // Batch add to ChromaDB
          if (uniqueDocuments.length > 0) {
            const batchSize = 100;
            for (let i = 0; i < uniqueDocuments.length; i += batchSize) {
              const batch = uniqueDocuments.slice(i, i + batchSize);
              await this.collection.add({
                ids: batch.map((d) => d.id),
                metadatas: batch.map(() => ({ name, version })),
                documents: batch.map((d) =>
                  JSON.stringify({
                    ...d.metadata,
                    content: d.content,
                  }),
                ),
              });
              logger.log(
                `Added batch ${i / batchSize + 1} of ${Math.ceil(uniqueDocuments.length / batchSize)}`,
              );
            }
          }
        }
      }
    } catch (err) {
      logger.error(`Failed to add package ${name}:`, err);
      throw err;
    }
  }

  /**
   * Helper method to read all files within a directory recursively.
   * This method reads all files regardless of their extension.
   *
   * @param dir - The directory to read.
   * @returns An array of file paths.
   */
  private async readAllFiles(dir: string): Promise<string[]> {
    const allFiles: string[] = [];

    const traverseDir = async (currentDir: string) => {
      const entries = await fsPromises.readdir(currentDir, {
        withFileTypes: true,
      });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          await traverseDir(fullPath);
        } else if (entry.isFile()) {
          allFiles.push(fullPath);
        }
      }
    };

    try {
      await traverseDir(dir);
      logger.log(`Found ${allFiles.length} files in directory ${dir}`);
      return allFiles;
    } catch (error: any) {
      logger.error(`Error reading files in directory ${dir}:`, error);
      throw new Error(
        `Failed to read files in directory ${dir}: ${error.message}`,
      );
    }
  }

  /**
   * Adds multiple packages to the handler concurrently.
   *
   * @param packages - An array of objects containing package names and their respective versions.
   */
  async addPackages(
    packages: Array<{ name: string; version: string }>,
  ): Promise<void> {
    await this.ensureInitialized();
    await Promise.all(
      packages.map((pkg) => this.addPackage(pkg.name, pkg.version)),
    );
  }

  /**
   * Searches for packages that are relevant to the given query string.
   * It generates an embedding for the query, calculates the cosine similarity
   * between the query embedding and each package's embedding, and returns
   * the packages sorted by their similarity scores in descending order.
   *
   * @param query - The search query string.
   * @returns An array of PackageInfo objects sorted by relevance to the query.
   */
  async searchContext(query: string): Promise<PackageInfo[]> {
    // Ensure the embedding model is initialized before proceeding.
    await this.ensureInitialized();
    const results = await this.collection.query({
      queryTexts: [query],
      nResults: 10,
    });

    return results.documents[0].map((doc) => JSON.parse(doc));
  }

  /**
   * Retrieves the information of a specific package by its name.
   *
   * @param packageName - The name of the package to retrieve information for.
   * @returns The PackageInfo object if found, otherwise undefined.
   */
  getPackageInfo(packageName: string): PackageInfo | undefined {
    return this.packages.get(packageName);
  }

  /**
   * Retrieves all stored packages and their information.
   *
   * @returns A new Map containing all packages and their respective PackageInfo.
   */
  getAllPackages(): Map<string, PackageInfo> {
    return new Map(this.packages);
  }
}

export default DependenciesEmbeddingHandler;
