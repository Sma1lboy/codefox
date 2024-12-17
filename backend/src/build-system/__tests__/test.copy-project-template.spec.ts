import { copyProjectTemplate } from 'src/build-system/utils/files';
import * as path from 'path';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';

describe('Copy Project Template', () => {
  it('should copy the template to the specified UUID folder', async () => {
    const templatePath = path.join(
      __dirname,
      '../../../template/template-backend',
    );
    const projectUUID = uuidv4();
    console.log(templatePath);

    const projectPath = await copyProjectTemplate(templatePath, projectUUID);

    // Validate that files were copied
    expect(await fs.access(projectPath)).toBeUndefined(); // Project folder exists

    // Cleanup
    await fs.rm(projectPath, { recursive: true, force: true });
  });
});
