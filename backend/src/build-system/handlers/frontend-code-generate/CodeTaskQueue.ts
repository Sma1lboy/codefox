export interface FileTask {
  filePath: string; // e.g. "src/components/MyComponent.ts"
  fileContents: string; // the code you got from the LLM
}

export class CodeTaskQueue {
  private tasks: FileTask[] = [];

  enqueue(task: FileTask) {
    this.tasks.push(task);
  }

  dequeue(): FileTask | undefined {
    return this.tasks.shift();
  }

  get size(): number {
    return this.tasks.length;
  }
}
