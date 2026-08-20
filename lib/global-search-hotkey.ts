"use client";

export interface SearchHotkeyInstance {
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
}

const instances = new Set<SearchHotkeyInstance>();
let active: SearchHotkeyInstance | null = null;
let listenerAttached = false;

function toggleActive() {
  if (!active) return;
  for (const instance of instances) {
    if (instance !== active) instance.close();
  }
  if (active.isOpen()) {
    active.close();
  } else {
    active.open();
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    toggleActive();
  }
}

function attachListener() {
  if (!listenerAttached) {
    document.addEventListener("keydown", handleKeyDown);
    listenerAttached = true;
  }
}

function detachListener() {
  if (listenerAttached && instances.size === 0) {
    document.removeEventListener("keydown", handleKeyDown);
    listenerAttached = false;
  }
}

export function registerSearchHotkey(instance: SearchHotkeyInstance): () => void {
  instances.add(instance);
  active = instance;
  attachListener();
  return () => {
    instances.delete(instance);
    if (active === instance) {
      active = instances.size ? ([...instances][instances.size - 1] ?? null) : null;
    }
    detachListener();
  };
}

export function openSearchHotkey(target: SearchHotkeyInstance): void {
  for (const instance of instances) {
    if (instance !== target) instance.close();
  }
  active = target;
  target.open();
}