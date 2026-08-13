
type Listener = () => void;

let isOpen = false;
const listeners = new Set<Listener>();

export function getSidebarOpen() {
  return isOpen;
}

export function toggleSidebar() {
  isOpen = !isOpen;
  listeners.forEach((l) => l());
}

export function setSidebarOpen(value: boolean) {
  isOpen = value;
  listeners.forEach((l) => l());
}

export function subscribeSidebar(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
