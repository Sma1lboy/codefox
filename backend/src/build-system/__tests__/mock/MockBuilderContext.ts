import { VirtualDirectory } from '../../virtual-dir';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as path from 'path';
import { UXSMSHandler } from 'src/build-system/handlers/ux/sitemap-structure';
import { UXDMDHandler } from 'src/build-system/handlers/ux/datamap';
import { BackendRequirementHandler } from 'src/build-system/handlers/backend/requirements-document';
import { FileFAHandler } from 'src/build-system/handlers/file-manager/file-arch';
import { BuilderContext, GlobalDataKeys } from 'src/build-system/context';
import { v4 as uuidv4 } from 'uuid'; // UUID generator for unique identifiers
import {
  BuildExecutionState,
  BuildHandlerConstructor,
  BuildSequence,
  ExtractHandlerReturnType,
} from 'src/build-system/types';
import { buildProjectPath, copyProjectTemplate } from '../../utils/files';

export class MockBuilderContext extends BuilderContext {
  private mockNodeData: Map<BuildHandlerConstructor, any> = new Map();
  private mockGlobalContext: Map<GlobalDataKeys | string, any> = new Map();
  virtualDirectory: VirtualDirectory;

  constructor(sequence: BuildSequence, id: string) {
    super(sequence, id); // Call the parent constructor to initialize inherited properties
    this.virtualDirectory = new VirtualDirectory(); // Initialize the mock virtual directory
    const uuid =
      new Date().toISOString().slice(0, 10).replace(/:/g, '-') + '-' + uuidv4();

    // Read mock data from files
    const uxSitemapStructure = this.readMockFile(
      path.join(__dirname, 'test_files', 'UX_Sitemap_Structure_Node.md'),
    );
    const uxDataMapDocument = this.readMockFile(
      path.join(__dirname, 'test_files', 'UX_DataMap_Document_Node.md'),
    );
    const backendRequirements = this.readMockFile(
      path.join(__dirname, 'test_files', 'Backend_Requirements_Node.md'),
    );
    const fileStructure = this.readMockFile(
      path.join(__dirname, 'test_files', 'File_Structure_Generation.md'),
    );
    const fileArchitecture = this.readMockFile(
      path.join(__dirname, 'test_files', 'File_Arch.md'),
    );

    this.mockNodeData.set(UXSMSHandler, uxSitemapStructure);
    this.mockNodeData.set(UXDMDHandler, uxDataMapDocument);
    this.mockNodeData.set(BackendRequirementHandler, backendRequirements);
    this.mockNodeData.set(FileFAHandler, fileArchitecture);
    this.buildVirtualDirectory(fileStructure);

    copyProjectTemplate(
      path.join(__dirname, '..', '..', '..', '..', 'template', 'react-ts'),
      uuid,
      'frontend',
    );

    // Set up mock data for globalContext
    this.mockGlobalContext.set(
      'frontendPath',
      buildProjectPath(uuid, 'frontend'),
    );
  }

  setGlobalContext<Key extends GlobalDataKeys | string>(
    key: Key,
    value: any,
  ): void {
    this.mockGlobalContext.set(key, value);
  }

  setNodeData<T extends BuildHandlerConstructor>(
    handlerClass: T,
    data: ExtractHandlerReturnType<T>,
  ): void {
    this.mockNodeData.set(handlerClass, data);
  }

  getExecutionState(): BuildExecutionState {
    return {} as BuildExecutionState; // Return a mock execution state
  }

  buildVirtualDirectory(jsonContent: string): boolean {
    return this.virtualDirectory.parseJsonStructure(jsonContent);
  }

  execute(): Promise<string> {
    return Promise.resolve(''); // Mock a resolved promise for execution
  }

  getNodeData(handler: any): any {
    return this.mockNodeData.get(handler) || null;
  }

  getGlobalContext(key: string): any {
    return this.mockGlobalContext.get(key) || null;
  }

  // Helper method to read files
  private readMockFile(filePath: string): string {
    try {
      const absolutePath = resolve(filePath); // Resolve the file path
      return readFileSync(absolutePath, 'utf-8'); // Read the file content
    } catch (err) {
      console.error(`Error reading file at ${filePath}:`, err);
      return ''; // Return an empty string if file read fails
    }
  }

  // Add other methods as necessary for mocking
}
