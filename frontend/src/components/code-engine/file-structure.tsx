'use client';

import { useContext, useEffect, useState } from 'react';
import {
  UncontrolledTreeEnvironment,
  Tree,
  StaticTreeDataProvider,
  TreeItem,
  TreeItemIndex,
} from 'react-complex-tree';
import 'react-complex-tree/lib/style-modern.css';
import { ProjectContext } from './project-context';

export interface FileNodeType {
  name: string;
  type: 'file' | 'folder';
  children?: FileNodeType[];
}

const convertToTreeData = (
  nodes: FileNodeType[],
  parentId: string | null = null
) => {
  const treeItems: Record<string, any> = {};

  nodes.forEach((node, index) => {
    const nodeId = parentId ? `${parentId}/${node.name}` : node.name;

    treeItems[nodeId] = {
      index,
      data: node,
      isFolder: node.type === 'folder',
      children: node.children
        ? node.children.map((child) => `${nodeId}/${child.name}`)
        : [],
    };

    if (node.children) {
      Object.assign(treeItems, convertToTreeData(node.children, nodeId));
    }
  });

  return treeItems;
};

export default function FileStructure({
  isCollapsed,
  filePath,
  data,
}: {
  filePath: string;
  isCollapsed: boolean;
  data: Record<TreeItemIndex, TreeItem<any>>;
}) {
  const { setFilePath } = useContext(ProjectContext);

  const dataProvider = new StaticTreeDataProvider(data, (item, newName) => ({
    ...item,
    data: newName,
  }));
  return (
    <div className="relative p-4">
      <h3 className="mb-2 font-bold">File Explorer</h3>
      {filePath && <div className="mt-4 p-2 text-sm">{filePath}</div>}

      <UncontrolledTreeEnvironment
        dataProvider={dataProvider}
        getItemTitle={(item) => item.data}
        viewState={{}}
        onSelectItems={(items) => {
          setFilePath(items[0].toString().replace(/^root\//, ''));
          console.log(items);
        }}
      >
        <Tree treeId="fileTree" rootItem="root" />
      </UncontrolledTreeEnvironment>
    </div>
  );
}
