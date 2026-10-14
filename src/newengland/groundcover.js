// Shared metre-scale patch pattern for plant placement and the ground beneath it.
// Art-only: never consume the seeded simulation RNG.
export function coverAt(x, z) {
  return .5 + .23 * Math.sin(x * .24 + Math.sin(z * .17) * 2.3)
    + .18 * Math.sin(z * .31 + Math.cos(x * .13) * 1.8)
    + .09 * Math.sin(x * .83 + z * .67);
}

export const coverShader = `
float nswCover(vec2 p) {
  return .5+.23*sin(p.x*.24+sin(p.y*.17)*2.3)
    +.18*sin(p.y*.31+cos(p.x*.13)*1.8)+.09*sin(p.x*.83+p.y*.67);
}`;
