import { readSave } from './save.js';
import { EXPEDITIONS } from './regions.js';
import { startTasmania } from './tasmania/main.js';
// Tasmania's dependencies load with the shell, so a previously loaded game can
// enter the expedition offline. The original game remains its own scene.
if (EXPEDITIONS.includes(readSave()?.activeRegion)) startTasmania(readSave().activeRegion);
else import('./main.js');
if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('./sw.js').catch(()=>{});
