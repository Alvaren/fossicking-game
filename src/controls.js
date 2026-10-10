// The original claim's pointer-lock and tool-selection behavior, shared by every
// location. Scenes supply their UI/state callbacks; the browser lifecycle lives here.
export const TOOL_ORDER = ['detector', 'shovel', 'pan', 'sieve', 'sluice', 'hammer', 'uv'];
export const toolForKey = code => TOOL_ORDER[['Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7'].indexOf(code)];

export function createPointerLock(canvas, { test = false, touch = false, onChange }) {
  let active = false, wanted = false, request = 0;
  const bypass = test || touch;
  function change(value, force = false) {
    if (value === active && !force) return;
    active = value;
    onChange(value);
  }
  function pause() {
    wanted = false; request++;
    change(false);
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  }
  document.addEventListener('pointerlockchange', () => {
    if (bypass) return;
    const locked = document.pointerLockElement === canvas;
    // A menu may have opened while the browser was processing the request.
    if (locked && !wanted) { document.exitPointerLock(); return; }
    if (!locked && active) wanted = false;
    change(locked);
  });
  return {
    pause,
    resume() {
      wanted = true;
      if (bypass) {
        change(true);
        if (touch) document.documentElement.requestFullscreen?.().catch(() => {});
        return;
      }
      const id = ++request;
      const failed = () => { if (request === id) { wanted = false; change(false, true); } };
      try {
        if (!canvas.requestPointerLock) { failed(); return; }
        canvas.requestPointerLock()?.catch(failed);
      } catch { failed(); }
    },
  };
}

export function bindToolWheel({ isPlaying, items, current, select, special = () => false }) {
  document.addEventListener('wheel', e => {
    if (!isPlaying() || !e.deltaY || e.ctrlKey) return;
    e.preventDefault();
    if (special(e)) return;
    const list = items();
    if (!list.length) return;
    const i = list.indexOf(current());
    select(list[(i + (e.deltaY > 0 ? 1 : list.length - 1)) % list.length]);
  }, { passive: false });
}
