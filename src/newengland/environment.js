import { buildRegionalEnvironment } from '../rendering/regionalenvironment.js';

// Keep the original NSW recipe; only the user-requested tree stature changes.
export function buildNewEnglandEnvironment(scene, context) {
  return buildRegionalEnvironment(scene, context, {
    treeHeights: { gum_0:1.1, gum_1:2.1, gum_2:1.45, gum_3:2.3 },
  });
}
