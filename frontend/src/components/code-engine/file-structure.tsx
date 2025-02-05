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
    <div className="relative p-4 prose dark:prose-invert">
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
        renderItem={({ item, depth, children, title, context, arrow }) => {
          const InteractiveComponent = context.isRenaming ? 'div' : 'button';
          const type = context.isRenaming ? undefined : 'button';
          return (
            <li
              {...(context.itemContainerWithChildrenProps as any)}
              className="rct-tree-item-li"
            >
              <div
                {...(context.itemContainerWithoutChildrenProps as any)}
                style={{ paddingLeft: `${(depth + 1) * 4}px` }}
                className={[
                  'rct-tree-item-title-container group',
                  item.isFolder && 'rct-tree-item-title-container-isFolder',
                  context.isSelected &&
                    'rct-tree-item-title-container-selected',
                  context.isExpanded &&
                    'rct-tree-item-title-container-expanded',
                  context.isFocused && 'rct-tree-item-title-container-focused',
                  context.isDraggingOver &&
                    'rct-tree-item-title-container-dragging-over',
                  context.isSearchMatching &&
                    'rct-tree-item-title-container-search-match',
                ].join(' ')}
              >
                {arrow}
                <InteractiveComponent
                  type={type}
                  {...(context.interactiveElementProps as any)}
                  className={[
                    'rct-tree-item-button transition-colors duration-200',
                    'dark:text-white dark:group-hover:text-black',
                    context.isSelected && 'dark:!bg-gray-700 dark:!text-white',
                  ].join(' ')}
                >
                  {title}
                </InteractiveComponent>
              </div>
              {children}
            </li>
          );
        }}
      >
        <Tree treeId="fileTree" rootItem="root" />
      </UncontrolledTreeEnvironment>
    </div>
  );
}
