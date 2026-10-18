import { useEffect, useState } from 'react';

/** The current time, refreshed every `intervalMs` so time-of-day UI doesn't go stale while the app is open. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
