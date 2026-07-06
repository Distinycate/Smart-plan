type QueueTask = {
  fn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
};

class RequestQueue {
  private queue: QueueTask[] = [];
  private activeCount = 0;

  async run<T>(fn: () => Promise<T>): Promise<T> {
    const maxConcurrent = Number(process.env.AI_MAX_CONCURRENT_REQUESTS || '1');
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.next(maxConcurrent);
    });
  }

  private next(maxConcurrent: number) {
    if (this.activeCount >= maxConcurrent || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    this.activeCount++;
    task.fn()
      .then(task.resolve)
      .catch(task.reject)
      .finally(() => {
        this.activeCount--;
        this.next(maxConcurrent);
      });
  }
}

const globalQueue = new RequestQueue();

export async function runAIRequestQueued<T>(fn: () => Promise<T>): Promise<T> {
  return globalQueue.run(fn);
}
