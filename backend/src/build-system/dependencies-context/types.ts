// new verison
export interface PackageDocument {
  id: string;
  metadata: {
    name: string;
    version: string;
    type: 'class' | 'interface' | 'function' | 'constant' | 'object';
    filepath: string;
    exportType: 'default' | 'named';
    description?: string;
    parameters?: string[];
    returnType?: string;
  };
  content: string;
}

/**
 * Interface representing the information of a package.
 */
export interface PackageInfo {
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
