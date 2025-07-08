'use client';

import { useState, useEffect } from 'react';

// A hook to use localStorage that is also SSR-compatible
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [value, setValue] = useState<T>(initialValue);

  // On mount, we check if there's a value in localStorage
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setValue(JSON.parse(item, (k, v) => {
          // revive dates from ISO string format
          if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(v)) {
            return new Date(v);
          }
          return v;
        }));
      }
    } catch (error) {
      // If error, we still have the initial value
      console.warn(`Error reading localStorage key “${key}”:`, error);
    }
  }, [key]);

  // This effect will update localStorage when the state changes
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Error setting localStorage key “${key}”:`, error);
    }
  }, [key, value]);

  return [value, setValue];
}
