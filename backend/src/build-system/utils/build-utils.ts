import { BuildHandlerManager } from '../hanlder-manager';
import { BuildSequence, BuildNode, BuildHandlerConstructor } from '../types';

/**
 * Helper function to sort a BuildSequence based on node dependencies using topological sort.
 * It ensures that each node's dependencies are executed before the node itself.
 *
 * @param sequence The build sequence to be sorted.
 * @returns A sorted array of nodes that respects the dependency order.
 */
export function sortBuildSequence(sequence: BuildSequence): BuildNode[] {
  const { nodes } = sequence;

  // Map to store the dependencies for each node
  const nodeDependencies: Map<
    BuildHandlerConstructor,
    Set<BuildHandlerConstructor>
  > = new Map();

  // Map to store the reverse of the dependency (i.e., which nodes depend on the current node)
  const dependentNodes: Map<
    BuildHandlerConstructor,
    Set<BuildHandlerConstructor>
  > = new Map();

  // Initialize the maps
  nodes.forEach((node) => {
    nodeDependencies.set(node.handler, new Set());
    dependentNodes.set(node.handler, new Set());
  });

  // Step 1: Analyze the dependencies of each handler (e.g., if a node has a dependency on another)
  nodes.forEach((node) => {
    const handlerClass = BuildHandlerManager.getInstance().getHandler(
      node.handler,
    );
    const dependencies = handlerClass.dependencies || [];

    dependencies.forEach((dep) => {
      // Add the dependency to the node's dependency list
      nodeDependencies.get(handlerClass)?.add(dep);

      // Also add the current node as a dependent of the dependency
      dependentNodes.get(dep)?.add(handlerClass);
    });
  });

  // Step 2: Perform topological sort (Kahn's algorithm)
  const sortedNodes: BuildNode[] = [];
  const queue: BuildHandlerConstructor[] = [];

  // Find all nodes with no dependencies (inDegree = 0)
  nodeDependencies.forEach((dependencies, handler) => {
    if (dependencies.size === 0) {
      queue.push(handler);
    }
  });

  // Perform Kahn's algorithm (topological sorting)
  while (queue.length > 0) {
    const currentHandler = queue.shift()!;
    const node = nodes.find((node) => node.handler === currentHandler);
    if (node) {
      sortedNodes.push(node);
    }

    // For each node that depends on the current node, reduce the dependency count
    const dependentHandlers = dependentNodes.get(currentHandler) || [];
    dependentHandlers.forEach((depHandler) => {
      // Remove the current node from the dependency list of the dependent node
      nodeDependencies.get(depHandler)?.delete(currentHandler);

      // If a node now has no remaining dependencies, add it to the queue
      if (nodeDependencies.get(depHandler)?.size === 0) {
        queue.push(depHandler);
      }
    });
  }

  // Step 3: If the sortedNodes array doesn't contain all nodes, there's a circular dependency
  if (sortedNodes.length !== nodes.length) {
    throw new Error('Circular dependency detected in the build sequence');
  }

  return sortedNodes;
}
