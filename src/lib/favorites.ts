import { useCallback } from 'react';
import { usePersisted } from './storage';

/** Saved sky objects (ids from the Find catalogue), kept on the device. */
export function useFavorites() {
  const [ids, setIds] = usePersisted<string[]>('favorites-v1', []);
  const toggle = useCallback((id: string) => setIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [id, ...p])), [setIds]);
  return { ids, toggle, has: (id: string) => ids.includes(id) };
}
