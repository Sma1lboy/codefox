// For App Router: app/api/media/[...path]/route.ts
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getMediaDir } from 'codefox-common';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Get the media directory path
    const mediaDir = getMediaDir();

    // Construct the full path to the requested file
    const filePath = path.join(mediaDir, ...params.path);

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      // Log directory contents for debugging
      try {
        if (fs.existsSync(mediaDir)) {
          const avatarsDir = path.join(mediaDir, 'avatars');
          if (fs.existsSync(avatarsDir)) {
            console.log(
              'Avatars directory contents:',
              fs.readdirSync(avatarsDir)
            );
          } else {
            console.log('Avatars directory does not exist');
          }
        } else {
          console.log('Media directory does not exist');
        }
      } catch (err) {
        console.error('Error reading directory:', err);
      }

      return new Response('File not found', { status: 404 });
    }

    // Read the file
    const fileBuffer = fs.readFileSync(filePath);

    // Determine content type based on file extension
    const ext = path.extname(filePath).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
    };

    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    // Return the file with appropriate headers
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Error serving media file:', error);
    return new Response(`Error serving file: ${error.message}`, {
      status: 500,
    });
  }
}
