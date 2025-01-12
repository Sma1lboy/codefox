import { copyProjectTemplate } from 'src/build-system/utils/files';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getTemplatePath } from 'src/config/common-path';
import { Logger } from '@nestjs/common';
/**
 * This test ensure project template exist
 */
describe('Copy Project Template', () => {
  it('should copy the template to the specified UUID folder', async () => {
    const templatePath = getTemplatePath('template-backend');
    const projectUUID = uuidv4();

    Logger.log('template-path:', templatePath);
    const projectPath = await copyProjectTemplate(templatePath, projectUUID);
    expect(await fs.access(projectPath)).toBeUndefined(); // Project folder exists
    await fs.rm(projectPath, { recursive: true, force: true });
  });
});
