import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Snapshot-based undo/redo.
 * Watches a serializable snapshot; debounced pushes create history entries.
 * `apply` restores a snapshot back into your state setters.
 */
export function useUndoRedo<T>(
  snapshot: T,
  apply: (s: T) => void,
  opts: { delay?: number; limit?: number; enabled?: boolean } = {}
) {
  const { delay = 500, limit = 60, enabled = true } = opts;
  const past = useRef<string[]>([]);
  const future = useRef<string[]>([]);
  const current = useRef<string>(JSON.stringify(snapshot));
  const applying = useRef(false);
  const [, force] = useState(0);
  const sync = () => force(n => n + 1);

  useEffect(() => {
    if (!enabled) return;
    const next = JSON.stringify(snapshot);
    if (applying.current) {
      applying.current = false;
      current.current = next;
      return;
    }
    if (next === current.current) return;
    const t = setTimeout(() => {
      if (next === current.current) return;
      past.current.push(current.current);
      if (past.current.length > limit) past.current.shift();
      future.current = [];
      current.current = next;
      sync();
    }, delay);
    return () => clearTimeout(t);
  }, [snapshot, delay, limit, enabled]);

  const undo = useCallback(() => {
    if (!past.current.length) return;
    const prev = past.current.pop()!;
    future.current.push(current.current);
    current.current = prev;
    applying.current = true;
    apply(JSON.parse(prev) as T);
    sync();
  }, [apply]);

  const redo = useCallback(() => {
    if (!future.current.length) return;
    const next = future.current.pop()!;
    past.current.push(current.current);
    current.current = next;
    applying.current = true;
    apply(JSON.parse(next) as T);
    sync();
  }, [apply]);

  const reset = useCallback((s: T) => {
    past.current = [];
    future.current = [];
    current.current = JSON.stringify(s);
    sync();
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, enabled]);

  return {
    undo, redo, reset,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    undoCount: past.current.length,
    redoCount: future.current.length,
  };
}
