import { mount } from 'svelte';
import { registerSW } from 'virtual:pwa-register';
import App from './ui/Game.svelte';
import './style.css';

// ---- MAKING A DEPLOY ACTUALLY REACH THE PHONE ---------------------------
//
// This was `registerSW({ immediate: true })`, which looks for a new build
// exactly once: at page load. On iOS the tab is suspended and restored without
// a real navigation for days at a time, so a green deploy could sit on the
// server and never arrive. The owner reported "nothing changes for me" twice;
// only the first cause (a dead CI job) was found, and this was the other half.
//
// `autoUpdate` in vite.config.ts already means a new worker takes over as soon
// as one is found. The missing piece was ever looking:
//
//   - when the tab becomes visible again, which is THE iOS case — the app is
//     almost never freshly loaded, it is resumed;
//   - and on a slow timer, for a session left open.
const UPDATE_EVERY_MS = 10 * 60 * 1000;

registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    const check = (): void => { void registration.update(); };
    setInterval(check, UPDATE_EVERY_MS);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
  },
});

mount(App, { target: document.getElementById('app')! });
