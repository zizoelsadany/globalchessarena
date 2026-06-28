const STORAGE_KEY = "gca_computer_matches";

export function loadComputerMatches() {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) || [];
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

export function saveComputerMatch(match) {
  if (typeof window === "undefined" || !match) return [];
  const matches = loadComputerMatches();
  const next = [match, ...matches].slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearComputerMatches() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
