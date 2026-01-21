/**
 * Batch Operations Utilities
 *
 * Utilities for optimizing bulk operations like batch API calls,
 * chunked processing, and state updates.
 */

/**
 * Process items in batches to avoid overwhelming the server
 *
 * @param items - Array of items to process
 * @param batchSize - Number of items per batch
 * @param processor - Async function to process each batch
 * @param onProgress - Optional callback for progress updates
 * @returns Combined results from all batches
 */
export async function processBatched<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R>,
  onProgress?: (processed: number, total: number) => void
): Promise<R[]> {
  const results: R[] = [];
  const total = items.length;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const result = await processor(batch);
    results.push(result);

    if (onProgress) {
      onProgress(Math.min(i + batchSize, total), total);
    }
  }

  return results;
}

/**
 * Process items in parallel batches with concurrency limit
 *
 * @param items - Array of items to process
 * @param concurrency - Maximum number of concurrent operations
 * @param processor - Async function to process each item
 * @param onProgress - Optional callback for progress updates
 * @returns Combined results from all items
 */
export async function processParallel<T, R>(
  items: T[],
  concurrency: number,
  processor: (item: T) => Promise<R>,
  onProgress?: (processed: number, total: number) => void
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let completed = 0;
  const total = items.length;

  // Create a pool of workers
  const workers: Promise<void>[] = [];
  let index = 0;

  const runWorker = async () => {
    while (index < items.length) {
      const currentIndex = index++;
      const item = items[currentIndex];
      results[currentIndex] = await processor(item);
      completed++;

      if (onProgress) {
        onProgress(completed, total);
      }
    }
  };

  // Start workers up to concurrency limit
  for (let i = 0; i < Math.min(concurrency, items.length); i++) {
    workers.push(runWorker());
  }

  await Promise.all(workers);
  return results;
}

/**
 * Debounced batch accumulator
 * Accumulates items and processes them in batches after a delay
 */
export function createBatchAccumulator<T>(
  processor: (items: T[]) => Promise<void>,
  delay: number = 100,
  maxBatchSize: number = 50
) {
  let items: T[] = [];
  let timeoutId: NodeJS.Timeout | null = null;

  const flush = async () => {
    if (items.length === 0) return;

    const batch = items;
    items = [];
    await processor(batch);
  };

  return {
    add: (item: T) => {
      items.push(item);

      // Flush if batch size reached
      if (items.length >= maxBatchSize) {
        if (timeoutId) clearTimeout(timeoutId);
        flush();
        return;
      }

      // Schedule flush after delay
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(flush, delay);
    },

    flush,

    clear: () => {
      items = [];
      if (timeoutId) clearTimeout(timeoutId);
    },
  };
}

/**
 * Split array into chunks of specified size
 *
 * @param array - Array to split
 * @param chunkSize - Size of each chunk
 * @returns Array of chunks
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Retry failed operations with exponential backoff
 *
 * @param operation - Async operation to retry
 * @param maxRetries - Maximum number of retries
 * @param baseDelay - Base delay in milliseconds
 * @returns Result of the operation
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Create a rate limiter for API calls
 *
 * @param requestsPerSecond - Maximum requests per second
 * @returns Rate-limited function wrapper
 */
export function createRateLimiter(requestsPerSecond: number) {
  const minInterval = 1000 / requestsPerSecond;
  let lastCallTime = 0;

  return async <T>(fn: () => Promise<T>): Promise<T> => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    if (timeSinceLastCall < minInterval) {
      await new Promise((resolve) =>
        setTimeout(resolve, minInterval - timeSinceLastCall)
      );
    }

    lastCallTime = Date.now();
    return fn();
  };
}
