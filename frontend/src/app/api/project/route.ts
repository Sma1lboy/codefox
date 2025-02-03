// app/api/project/route.ts
import { NextResponse } from 'next/server';
import { FileReader } from '@/utils/file_reader';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('id');

  if (!projectId) {
    return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
  }

  try {
    const res = await fetchFileStructure(projectId);
    console.log(res);
    return NextResponse.json({ res });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to read project files' },
      { status: 500 }
    );
  }
}

async function fetchFileStructure(projectId) {
  const reader = FileReader.getInstance();
  const res = await reader.getAllPaths(projectId);

  const projectPrefix = res[0].split('/')[0] + '/';

  const cleanedPaths = res.map((path) => path.replace(projectPrefix, ''));

  function buildTree(paths) {
    const tree = {};

    paths.forEach((path) => {
      const parts = path.split('/');
      let node = tree;

      parts.forEach((part, index) => {
        if (!node[part]) {
          node[part] = index === parts.length - 1 ? null : {};
        }
        node = node[part];
      });
    });

    return tree;
  }

  function convertTreeToList(tree) {
    return Object.keys(tree).map((name) => {
      if (tree[name]) {
        return {
          name,
          type: 'folder',
          children: convertTreeToList(tree[name]),
        };
      } else {
        return { name, type: 'file' };
      }
    });
  }

  const tree = buildTree(cleanedPaths);
  const fileStructure = convertTreeToList(tree);

  return fileStructure;
}
