/**
 * Super Queue implementation optimized for JS by:
 * - avoiding shifting
 * - controlling memory usage
 * - using safe modulo operations
 * - enabling modifications of latest element
 */
class Queue<T> {
  private elements: T[];
  private head: number;
  private tail: number;
  private currentSize: number;
  private readonly maxSize: number;

  /**
   * Creates a new Queue instance
   * @param maxSize - Maximum number of elements the queue can simultaneously hold (defaults to 400)
   */
  constructor(maxSize: number = 400) {
    this.elements = [];
    this.head = 0;
    this.tail = 0;
    this.currentSize = 0;
    this.maxSize = maxSize;
  }

  /**
   * Add an element to the end of the queue
   * @param element - Element to enqueue
   */
  enqueue(element: T): void {
    if (this.currentSize >= this.maxSize) {
      throw new Error(`Queue capacity exceeded (max ${this.maxSize} elements)`);
    }

    this.elements[this.tail] = element;
    this.tail = (this.tail + 1) % this.maxSize;
    this.currentSize++;
  }

  /**
   * Remove and return the first element in the queue
   * @returns The first element in the queue
   * @throws Error if queue is empty
   */
  dequeue(): T {
    if (this.isEmpty()) {
      throw new Error("Queue is empty");
    }

    const element = this.elements[this.head];
    this.head = (this.head + 1) % this.maxSize;
    this.currentSize--;
    return element;
  }

  /**
   * Look at the first element without removing it
   * @returns The first element in the queue
   * @throws Error if queue is empty
   */
  peek(): T {
    if (this.isEmpty()) {
      throw new Error("Queue is empty");
    }
    return this.elements[this.head];
  }

  /**
   * Look at the last element added without removing it
   * @returns The last element in the queue
   * @throws Error if queue is empty
   */
  peekLatest(): T {
    if (this.isEmpty()) {
      throw new Error("Queue is empty");
    }
    const latestIndex = (this.tail - 1 + this.maxSize) % this.maxSize;
    return this.elements[latestIndex];
  }

  /**
   * Modify the last element added to the queue
   * @param updateFn - Function that takes the current latest element and returns the modified element
   * @throws Error if queue is empty
   */
  modifyLatest(updateFn: (current: T) => T): void {
    if (this.isEmpty()) {
      throw new Error("Queue is empty");
    }
    const latestIndex = (this.tail - 1 + this.maxSize) % this.maxSize;
    this.elements[latestIndex] = updateFn(this.elements[latestIndex]);
  }

  /**
   * Replace the last element added to the queue
   * @param newElement - The new element to replace the latest with
   * @throws Error if queue is empty
   */
  replaceLatest(newElement: T): void {
    if (this.isEmpty()) {
      throw new Error("Queue is empty");
    }
    const latestIndex = (this.tail - 1 + this.maxSize) % this.maxSize;
    this.elements[latestIndex] = newElement;
  }

  /**
   * Check if the queue is empty
   * @returns True if queue is empty, false otherwise
   */
  isEmpty(): boolean {
    return this.currentSize === 0;
  }

  /**
   * Get the current size of the queue
   * @returns Number of elements in the queue
   */
  size(): number {
    return this.currentSize;
  }

  /**
   * Clear the queue and reset all pointers
   * This helps in garbage collection when you're done with the queue
   */
  clear(): void {
    this.elements = [];
    this.head = 0;
    this.tail = 0;
    this.currentSize = 0;
  }

  /**
   * Get all elements in the queue in order without modifying the queue
   * @returns Array of all elements in queue order
   */
  toArray(): T[] {
    const result: T[] = [];
    if (this.isEmpty()) return result;

    let current = this.head;
    for (let i = 0; i < this.currentSize; i++) {
      result.push(this.elements[current]);
      current = (current + 1) % this.maxSize;
    }
    return result;
  }
}

export default Queue;
