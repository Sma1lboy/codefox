'use client';
import { useContext, useEffect, useState } from 'react';
import {
  StaticTreeDataProvider,
  Tree,
  TreeItem,
  TreeItemIndex,
  UncontrolledTreeEnvironment,
} from 'react-complex-tree';
import 'react-complex-tree/lib/style-modern.css';
import { Loader } from 'lucide-react';
import { ProjectContext } from './project-context';

export interface FileNodeType {
  name: string;
  type: 'file' | 'folder';
  children?: FileNodeType[];
}

interface FileStructureProps {
  filePath: string;
  data: Record<TreeItemIndex, TreeItem<string>>;
  isLoading?: boolean;
}

export default function FileStructure({
  filePath,
  data,
  isLoading = false,
}: FileStructureProps) {
  const { setFilePath } = useContext(ProjectContext);
  const [dataProvider, setDataprovider] = useState(
    new StaticTreeDataProvider(data, (item, newName) => ({
      ...item,
      data: newName,
    }))
  );

  // Determine if we're in a loading state (either from prop or empty data)
  const isEmpty = Object.keys(data).length === 0;
  const showLoading = isLoading || isEmpty;

  useEffect(() => {
    if (!isEmpty) {
      setDataprovider(
        new StaticTreeDataProvider(data, (item, newName) => ({
          ...item,
          data: newName,
        }))
      );
    }
  }, [data, isEmpty]);

  return (
    <div className="relative p-4 prose dark:prose-invert">
      <h3 className="mb-2 font-bold">File Explorer</h3>
      {filePath && <div className="mt-4 p-2 text-sm break-all">{filePath}</div>}

      {showLoading ? (
        <div className="flex flex-col items-center justify-center h-48 space-y-3">
          <Loader className="w-6 h-6 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading files...</p>
        </div>
      ) : (
        <UncontrolledTreeEnvironment
          dataProvider={dataProvider}
          getItemTitle={(item) => item.data}
          viewState={{}}
          onSelectItems={(items) => {
            if (items.length > 0) {
              setFilePath(items[0].toString().replace(/^root\//, ''));
            }
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
                    context.isFocused &&
                      'rct-tree-item-title-container-focused',
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
                      context.isSelected &&
                        'dark:!bg-gray-700 dark:!text-white',
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
      )}
    </div>
  );
}
