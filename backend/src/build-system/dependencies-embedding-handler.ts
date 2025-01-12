import * as path from 'path';
import {
  existsSync,
  mkdirSync,
  promises as fsPromises,
  readFileSync,
  copyFileSync,
} from 'fs-extra';
import { EmbeddingModel, FlagEmbedding } from 'fastembed';
import pacote from 'pacote';
import tar from 'tar';
import { Logger } from '@nestjs/common';

/**
 * Interface representing the information of a package.
 */
interface PackageInfo {
  /**
   * The name of the package.
   */
  name: string;

  /**
   * The version of the package.
   */
  version: string;

  /**
   * Optional field containing type definitions information.
   */
  types?: {
    /**
     * The name of the type definitions package, typically in the format `@types/{packageName}`.
     */
    name: string;

    /**
     * The version of the type definitions package.
     */
    version: string;

    /**
     * An array of strings representing the content of the type definitions.
     */
    content: string[];
  };

  /**
   * Optional field containing the embedding vector for the package.
   */
  embedding?: Float32Array;
}

const logger = new Logger('dependencies-embedding-handler');

/**
 * Class responsible for handling dependencies and their embeddings.
 * It manages packages, downloads their contents, generates embeddings,
 * and provides search functionality based on those embeddings.
 */
class DependenciesEmbeddingHandler {
  /**
   * A map storing package information, keyed by the package name.
   */
  private packages: Map<string, PackageInfo>;

  /**
   * The embedding model used to generate embeddings for packages and queries.
   */
  private embeddingModel: FlagEmbedding | null;

  /**
   * A flag indicating whether the embedding model has been initialized.
   */
  private initialized: boolean;

  /**
   * A promise that resolves once the embedding model is initialized.
   */
  private initPromise: Promise<void>;

  /**
   * Constructor initializes the packages map, embedding model,
   * and starts the initialization process for the embedding model.
   */
  constructor() {
    this.packages = new Map();
    this.embeddingModel = null;
    this.initialized = false;
    this.initPromise = this.initialize();
  }

  /**
   * Initializes the embedding model by calling the asynchronous init method
   * from the FlagEmbedding class. Sets the initialized flag to true upon success.
   * If initialization fails, logs the error and rethrows it.
   */
  private async initialize() {
    try {
      // Initialize the embedding model with the specified model type.
      this.embeddingModel = await FlagEmbedding.init({
        model: EmbeddingModel.BGEBaseEN,
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

    if (!this.embeddingModel) {
      throw new Error('Embedding model not initialized');
    }

    try {
      logger.log(`[DEBUG] Starting addPackage for ${name}@${version}`);
      const packageDir = await this.downloadAndExtractPackage(name, version);
      const tsFiles = await this.readTypeScriptFiles(packageDir);
      let fileContents: string[] = [];

      if (tsFiles.length > 0) {
        logger.log(
          `[DEBUG] Processing ${tsFiles.length} TypeScript files for ${name}@${version}`,
        );
        for (const file of tsFiles) {
          try {
            const content = readFileSync(file, 'utf-8');
            const enrichedContent = `// Package: ${name}@${version}\n${content}`;
            fileContents.push(enrichedContent);
          } catch (readError: any) {
            logger.warn(`Failed to read file ${file}:`, readError);
          }
        }
      } else {
        logger.log(
          `[DEBUG] No TypeScript files found, processing all files for ${name}@${version}`,
        );
        const allFiles = await this.readAllFiles(packageDir);
        logger.log(`[DEBUG] Found ${allFiles.length} total files`);

        for (const file of allFiles) {
          try {
            if (
              file.endsWith('.js') ||
              file.endsWith('.json') ||
              file.endsWith('.md') ||
              file.endsWith('.txt') ||
              file.endsWith('.ts') ||
              file.endsWith('.d.ts')
            ) {
              const content = readFileSync(file, 'utf-8');
              const enrichedContent = `// Package: ${name}@${version}\n${content}`;
              fileContents.push(enrichedContent);
            }
          } catch (readError: any) {
            logger.warn(`Failed to read file ${file}:`, readError);
          }
        }
      }

      logger.log(`[DEBUG] Initial fileContents length: ${fileContents.length}`);

      // Filter and trim content
      fileContents = fileContents.filter((content) => {
        const trimmed = content.trim();
        if (!trimmed) {
          logger.log('[DEBUG] Filtered out empty content');
          return false;
        }
        if (content.length > 8192) {
          logger.log('[DEBUG] Trimming content longer than 8192 characters');
          return content.slice(0, 8192);
        }
        return true;
      });

      logger.log(
        `[DEBUG] Filtered fileContents length: ${fileContents.length}`,
      );

      if (fileContents.length === 0) {
        throw new Error('No valid content to generate embeddings');
      }

      // Process embeddings in batches
      const embeddings: Float32Array[] = [];
      const batchSize = 10;

      try {
        for (let i = 0; i < fileContents.length; i += batchSize) {
          const batch = fileContents.slice(i, i + batchSize);
          logger.log(
            `[DEBUG] Processing batch ${i / batchSize + 1}, size: ${batch.length}`,
          );

          const batchEmbeddings = await this.embeddingModel.passageEmbed(batch);
          logger.log(
            `[DEBUG] Batch embeddings type: ${typeof batchEmbeddings}`,
          );
          logger.log(
            `[DEBUG] Batch embeddings structure: ${JSON.stringify({
              isArray: Array.isArray(batchEmbeddings),
              firstElementType: batchEmbeddings[0]
                ? typeof batchEmbeddings[0]
                : 'undefined',
              isFloat32Array: batchEmbeddings[0] instanceof Float32Array,
              dimensions: Array.isArray(batchEmbeddings[0])
                ? batchEmbeddings[0].length
                : 'N/A',
            })}`,
          );

          for await (const embed of batchEmbeddings) {
            logger.log(`[DEBUG] Processing embedding of type: ${typeof embed}`);
            if (embed instanceof Float32Array) {
              logger.log('[DEBUG] Found Float32Array embedding');
              embeddings.push(embed);
            } else if (Array.isArray(embed)) {
              logger.log(
                `[DEBUG] Found Array embedding of length: ${embed.length}`,
              );
              // Check if it's a nested array
              const flattened = embed.flat();
              logger.log(`[DEBUG] Flattened array length: ${flattened.length}`);
              embeddings.push(new Float32Array(flattened));
            } else {
              logger.warn(`[DEBUG] Invalid embedding type: ${typeof embed}`);
              continue;
            }
          }
        }

        logger.log(`[DEBUG] Total embeddings generated: ${embeddings.length}`);

        if (embeddings.length === 0) {
          throw new Error('No valid embeddings generated');
        }

        logger.log('[DEBUG] Aggregating embeddings');
        const aggregatedEmbedding = this.aggregateEmbeddings(embeddings);
        logger.log(
          `[DEBUG] Aggregated embedding length: ${aggregatedEmbedding.length}`,
        );

        const packageInfo: PackageInfo = {
          name,
          version,
          types: {
            name: `@types/${name}`,
            version,
            content: fileContents,
          },
          embedding: aggregatedEmbedding,
        };

        this.packages.set(name, packageInfo);
        logger.log(`Package ${name}@${version} added successfully.`);
      } catch (embeddingError: any) {
        logger.error('[DEBUG] Embedding generation error:', {
          message: embeddingError.message,
          stack: embeddingError.stack,
        });
        throw new Error(
          `Failed to generate embedding for package ${name}@${version}: ${embeddingError.message}`,
        );
      }
    } catch (err: any) {
      logger.error(`Failed to add package ${name}:`, err);
      throw new Error(`Failed to add package ${name}: ${err.message}`);
    }
  }

  /**
   * Aggregates multiple Float32Array embeddings into a single Float32Array.
   * This example computes the element-wise average of all embeddings.
   *
   * @param embeddings - An array of Float32Array embeddings.
   * @returns A single Float32Array representing the aggregated embedding.
   */
  private aggregateEmbeddings(embeddings: Float32Array[]): Float32Array {
    if (embeddings.length === 0) {
      throw new Error('No embeddings to aggregate');
    }

    const embeddingLength = embeddings[0].length;
    const aggregated = new Float32Array(embeddingLength);

    // Sum all embeddings
    for (const embed of embeddings) {
      for (let i = 0; i < embeddingLength; i++) {
        aggregated[i] += embed[i];
      }
    }

    // Divide by the number of embeddings to get the average
    for (let i = 0; i < embeddingLength; i++) {
      aggregated[i] /= embeddings.length;
    }

    return aggregated;
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
    // Ensure the embedding model is initialized before proceeding.
    await this.ensureInitialized();

    // Add all packages concurrently using Promise.all.
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

    if (!this.embeddingModel) {
      throw new Error('Embedding model not initialized');
    }

    try {
      logger.log(`Searching for context related to query: "${query}"`);

      // Generate an embedding vector for the query string.
      const queryResult = await this.embeddingModel.queryEmbed(query);
      const queryEmbedding = new Float32Array(queryResult);

      // Initialize an array to hold packages along with their similarity scores.
      const results: Array<{ package: PackageInfo; similarity: number }> = [];

      // Iterate over each stored package to calculate similarity with the query.
      this.packages.forEach((pkg) => {
        if (pkg.embedding) {
          // Calculate cosine similarity between query embedding and package embedding.
          const similarity = this.cosineSimilarity(
            queryEmbedding,
            pkg.embedding,
          );
          results.push({ package: pkg, similarity });
        }
      });

      // Sort the results by similarity in descending order and return the packages.
      const sortedResults = results
        .sort((a, b) => b.similarity - a.similarity)
        .map((result) => result.package);

      logger.log(
        `Search completed. Found ${sortedResults.length} relevant packages.`,
      );

      return sortedResults;
    } catch (err) {
      // Log the error if the search fails and return an empty array.
      logger.error('Failed to search context:', err);
      return [];
    }
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

  /**
   * Calculates the cosine similarity between two Float32Array vectors.
   * Cosine similarity measures the cosine of the angle between two vectors,
   * providing a measure of how similar the two vectors are.
   *
   * @param a - The first embedding vector.
   * @param b - The second embedding vector.
   * @returns A number representing the cosine similarity between the two vectors.
   */
  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    // Iterate through each component of the vectors to compute dot product and norms.
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    // Compute the cosine similarity using the dot product and norms.
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

/**
 * Utility function to ensure a directory exists.
 *
 * @param dirPath - The path of the directory to ensure.
 * @returns The ensured directory path.
 */
const ensureDir = (dirPath: string): string => {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
    logger.log(`Created directory: ${dirPath}`);
  }
  return dirPath;
};

/**
 * Returns the root temporary directory.
 *
 * @returns The path to the root temporary directory.
 */
const getTempDir = (): string => {
  // Assuming ROOT_DIR is defined in your existing path utilities
  // Replace 'ROOT_DIR' with the appropriate variable or import if necessary
  const ROOT_DIR = ensureDir(
    path.join(__dirname, '..', '..', '..', '.codefox'),
  );
  const tempDir = path.join(ROOT_DIR, 'temp');
  return ensureDir(tempDir);
};

export default DependenciesEmbeddingHandler;
