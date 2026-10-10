export * from './northeast.js';
import { takeSample as sample } from './northeast.js';
import { rollPanContents } from '../minerals.js';
export const takeSample = (expedition,site) => sample(expedition,site,rollPanContents);
