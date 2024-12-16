import * as fs from 'fs';
import * as path from 'path';
import { ConfigLoader, exampleConfigContent } from './config-loader';

jest.mock('fs');
jest.mock('path');

describe('ConfigLoader', () => {
  const mockConfigPath = '/mock/path/config.json';

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReset();
    (fs.readFileSync as jest.Mock).mockReset();
    (fs.writeFileSync as jest.Mock).mockReset();
    (fs.mkdirSync as jest.Mock).mockReset();
  });

  describe('initConfigFile', () => {
    it('should create a new config file with example configuration', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      ConfigLoader.initConfigFile(mockConfigPath);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockConfigPath,
        exampleConfigContent,
        'utf-8',
      );
    });

    it('should throw error if config file already exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      expect(() => {
        ConfigLoader.initConfigFile(mockConfigPath);
      }).toThrow('Config file already exists');
    });

    it('should handle JSON with comments when loading config', () => {
      const configWithComments = `{
        // This is a comment
        "chats": {
          "test": {
            "model": "test-model" // Another comment
          }
        }
      }`;

      (fs.readFileSync as jest.Mock).mockReturnValue(configWithComments);
      const loader = new ConfigLoader(mockConfigPath);

      expect(loader.getChatConfig('test')).toEqual({ model: 'test-model' });
    });
  });

  describe('constructor and loadConfig', () => {
    it('should load existing config file', () => {
      const mockConfig = { chats: { test: { model: 'test-model' } } };
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify(mockConfig),
      );

      const loader = new ConfigLoader(mockConfigPath);
      expect(loader.getChatConfig('test')).toEqual({ model: 'test-model' });
    });

    it('should create empty config if file does not exist', () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw { code: 'ENOENT' };
      });

      const loader = new ConfigLoader(mockConfigPath);
      expect(loader.getChatConfig()).toBeNull();
    });

    it('should create empty config if file is empty', () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected end of JSON input');
      });

      const loader = new ConfigLoader(mockConfigPath);
      expect(loader.getChatConfig()).toBeNull();
    });
  });

  describe('getChatConfig', () => {
    it('should return specific chat config when id is provided', () => {
      const mockConfig = {
        chats: {
          test: { model: 'test-model' },
        },
      };
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify(mockConfig),
      );

      const loader = new ConfigLoader(mockConfigPath);
      expect(loader.getChatConfig('test')).toEqual({ model: 'test-model' });
    });

    it('should return default chat config when no id is provided', () => {
      const mockConfig = {
        chats: {
          default: { model: 'default-model', default: true },
          other: { model: 'other-model' },
        },
      };
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify(mockConfig),
      );

      const loader = new ConfigLoader(mockConfigPath);
      expect(loader.getChatConfig()).toEqual({
        model: 'default-model',
        default: true,
      });
    });

    it('should return first available config when no default is set', () => {
      const mockConfig = {
        chats: {
          first: { model: 'first-model' },
          second: { model: 'second-model' },
        },
      };
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify(mockConfig),
      );

      const loader = new ConfigLoader(mockConfigPath);
      expect(loader.getChatConfig()).toEqual({ model: 'first-model' });
    });

    it('should return null when chats config does not exist', () => {
      const mockConfig = {};
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify(mockConfig),
      );

      const loader = new ConfigLoader(mockConfigPath);
      expect(loader.getChatConfig()).toBeNull();
    });
  });

  describe('getEmbeddingConfig', () => {
    it('should return embedding config when it exists', () => {
      const mockConfig = {
        embeddings: { model: 'embedding-model' },
      };
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify(mockConfig),
      );

      const loader = new ConfigLoader(mockConfigPath);
      expect(loader.getEmbeddingConfig()).toEqual({ model: 'embedding-model' });
    });

    it('should return null when embedding config does not exist', () => {
      const mockConfig = {};
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify(mockConfig),
      );

      const loader = new ConfigLoader(mockConfigPath);
      expect(loader.getEmbeddingConfig()).toBeNull();
    });
  });

  describe('validateConfig', () => {
    it('should throw error when chat model is missing', () => {
      const mockConfig = {
        chats: {
          test: { endpoint: 'test-endpoint' },
        },
      };
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify(mockConfig),
      );

      expect(() => {
        new ConfigLoader(mockConfigPath);
      }).toThrow("Invalid chat configuration for 'test': 'model' is required");
    });

    it('should throw error when embedding model is missing', () => {
      const mockConfig = {
        embeddings: { endpoint: 'test-endpoint' },
      };
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify(mockConfig),
      );

      expect(() => {
        new ConfigLoader(mockConfigPath);
      }).toThrow("Invalid embedding configuration: 'model' is required");
    });
  });

  describe('set and get', () => {
    it('should set and save new configuration values', () => {
      const mockConfig = {};
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify(mockConfig),
      );

      const loader = new ConfigLoader(mockConfigPath);
      loader.set('chats.test', { model: 'test-model' });

      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(loader.getChatConfig('test')).toEqual({ model: 'test-model' });
    });

    it('should get configuration values using path', () => {
      const mockConfig = {
        chats: {
          test: { model: 'test-model' },
        },
      };
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify(mockConfig),
      );

      const loader = new ConfigLoader(mockConfigPath);
      expect(loader.get('chats.test.model')).toBe('test-model');
    });

    it('should return full config when no path is provided', () => {
      const mockConfig = {
        chats: {
          test: { model: 'test-model' },
        },
      };
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify(mockConfig),
      );

      const loader = new ConfigLoader(mockConfigPath);
      expect(loader.get()).toEqual(mockConfig);
    });
  });
});
