// app/api/project/route.ts
import { NextResponse } from 'next/server';
import { FileReader } from '@/utils/file-reader';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('path');

  if (!projectId) {
    return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
  }

  try {
    const res = await fetchFileStructure(projectId);
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

  if (!res || res.length === 0) {
    return {
      root: {
        index: 'root',
        isFolder: true,
        children: [],
        data: 'Root',
        canMove: true,
        canRename: true,
      },
    };
  }

  const projectPrefix = res[0].split('/')[0] + '/';
  const cleanedPaths = res.map((path) => path.replace(projectPrefix, ''));

  const fileRegex = /\.[a-z0-9]+$/i;

  function buildTree(paths) {
    const tree = {};

    paths.forEach((path) => {
      const parts = path.split('/');
      let node = tree;

      parts.forEach((part, index) => {
        const isFile = fileRegex.test(part);

        if (!node[part]) {
          node[part] = {
            __isFolder: !isFile,
            children: !isFile ? {} : undefined,
          };
        }

        if (!isFile) {
          node = node[part].children;
        }
      });
    });

    return tree;
  }

  function convertTreeToComplexTree(tree, parentId = 'root') {
    const items = {};

    Object.keys(tree).forEach((name, index) => {
      const id = `${parentId}/${name}`;
      const isFolder = tree[name].__isFolder;

      items[id] = {
        index: id,
        canMove: true,
        isFolder,
        children: isFolder
          ? Object.keys(tree[name].children).map((child) => `${id}/${child}`)
          : [],
        data: name,
        canRename: true,
      };

      if (isFolder) {
        Object.assign(items, convertTreeToComplexTree(tree[name].children, id));
      }
    });

    return items;
  }

  const tree = buildTree(cleanedPaths);

  const items = {
    root: {
      index: 'root',
      isFolder: true,
      canMove: true,
      canRename: true,
      children: Object.keys(tree).map((name) => `root/${name}`),
      data: 'Root',
    },
    ...convertTreeToComplexTree(tree, 'root'),
  };

  return items;
}
