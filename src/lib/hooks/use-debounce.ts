import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Hook that debounces a value
 *
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default 300ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook that returns a debounced callback function
 *
 * @param callback - The callback to debounce
 * @param delay - The delay in milliseconds (default 300ms)
 * @returns The debounced callback
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  ) as T;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * Hook for search input with debouncing
 *
 * @param initialValue - Initial search value
 * @param delay - Debounce delay in milliseconds (default 300ms)
 * @returns Object with search value, debounced value, and setter
 */
export function useDebouncedSearch(initialValue: string = "", delay: number = 300) {
  const [searchValue, setSearchValue] = useState(initialValue);
  const debouncedValue = useDebounce(searchValue, delay);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  }, []);

  const clear = useCallback(() => {
    setSearchValue("");
  }, []);

  return {
    value: searchValue,
    debouncedValue,
    setValue: setSearchValue,
    onChange: handleChange,
    clear,
    isDebouncing: searchValue !== debouncedValue,
  };
}
