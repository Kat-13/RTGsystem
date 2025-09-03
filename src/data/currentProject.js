let currentProjectId = null;
const subs = new Set();

export function setCurrentProjectId(id) {
  currentProjectId = id;
  subs.forEach(fn => fn(id));
}
export function getCurrentProjectId() { 
  return currentProjectId; 
}
export function onProjectChange(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}
