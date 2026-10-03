import { useSyncExternalStore } from "react";

const KEY = "mailflow-notifications-read";

const DEFAULT_UNREAD: string[] = [];

const listeners = new Set<() => void>();

let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;

  try {
    const raw = localStorage.getItem(KEY);

    cache = raw
      ? (JSON.parse(raw) as string[])
      : DEFAULT_UNREAD;
  } catch {
    cache = DEFAULT_UNREAD;
  }

  return cache;
}

export function useUnread(): string[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    read,
    () => DEFAULT_UNREAD,
  );
}

export function setUnread(ids: string[]) {
  cache = ids;

  try {
    localStorage.setItem(
      KEY,
      JSON.stringify(ids),
    );
  } catch {
    // Ignore localStorage errors.
  }

  listeners.forEach((listener) => listener());
}