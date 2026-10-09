// Saving: everything goes in localStorage under one key. Big arrays (dug
// ground, hand-dig patches) are packed as base64 typed arrays to stay small.

export const SAVE_KEY = 'fossicking-save-v2';

export function packArray(typed) {
  const bytes = new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function unpackArray(str, Type) {
  const s = atob(str);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return new Type(bytes.buffer);
}

export function readSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && typeof s.seed === 'number') return s;
    // Carry cash, gold and gear over from the first version; the ground itself is new.
    const old = JSON.parse(localStorage.getItem('fossicking-save-v1'));
    if (old && typeof old.seed === 'number') return { seed: old.seed, cash: old.cash, gold: old.gold, up: old.up };
  } catch { /* no save, or storage blocked */ }
  return null;
}

// Returns true if it stuck.
export function storeSave(data) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false; // storage full or blocked
  }
}
