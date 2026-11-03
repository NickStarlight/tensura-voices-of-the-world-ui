/**
 * @typedef {object} SceneConfig
 * @property {number} textureSize
 * @property {number} maxPixelRatio
 * @property {number} maxPixels
 * @property {number} timeScale
 * @property {{inner:number,runes:number,outer:number,script:number}} wheels
 * @property {{minSpeed:number,maxSpeed:number,columns:number,rows:number,density:number}} stars
 * @property {{radius:number,width:number}} halo
 * @property {{edgeDispersion:number}} optics
 * @property {{grain:number}} film
 */
/**
 * Main visual controls; shader constants are inserted once at startup.
 * @type {SceneConfig}
 */
export const CONFIG = {
  textureSize: 2048,
  maxPixelRatio: 1.5,
  maxPixels: 2_000_000,
  timeScale: 1.4375,
  wheels: { inner: -0.0975, runes: 0.057, outer: -0.0255, script: 0.036 },
  stars: {
    minSpeed: 0.04,
    maxSpeed: 0.105,
    columns: 38,
    rows: 4,
    density: 0.4,
  },
  halo: { radius: 0.115, width: 85 },
  optics: { edgeDispersion: 0.017 },
  film: { grain: 1 },
};
export const TEXTURES = [
  "u_inner",
  "u_middle",
  "u_outer",
  "u_script",
  "u_land",
];
