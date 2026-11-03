import { CONFIG, TEXTURES } from "./scene-config.js";
import { ringTexture, landTexture } from "./scene-textures.js";
import { vertexSource, fragmentSource } from "./scene-shaders.js";

/** @param {HTMLCanvasElement} canvas @param {string} message */
function showError(canvas, message) {
  const note = document.createElement("p");
  note.className = "error";
  note.textContent = message;
  canvas.replaceWith(note);
}

/** @param {WebGLRenderingContext} gl @param {number} type @param {string} source */
function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Could not create a shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  const error = gl.getShaderInfoLog(shader);
  gl.deleteShader(shader);
  throw new Error(error || "Shader compilation failed");
}

/** @param {WebGLRenderingContext} gl */
function createProgram(gl) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  let fragment;
  try {
    fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  } catch (error) {
    gl.deleteShader(vertex);
    throw error;
  }
  const program = gl.createProgram();
  if (!program) throw new Error("Could not create a WebGL program");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  const error = gl.getProgramInfoLog(program);
  gl.deleteProgram(program);
  throw new Error(error || "Program linking failed");
}

/** @param {WebGLRenderingContext} gl @param {WebGLProgram} program */
function bindFullscreenTriangle(gl, program) {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error("Could not create a vertex buffer");
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  const position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
}

/**
 * Uploads one canvas mask to a shader sampler.
 * @param {WebGLRenderingContext} gl
 * @param {WebGLProgram} program
 * @param {HTMLCanvasElement} image
 * @param {number} unit
 * @param {string} uniform
 */
function uploadTexture(gl, program, image, unit, uniform) {
  const texture = gl.createTexture();
  if (!texture) throw new Error(`Could not create texture ${uniform}`);
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.uniform1i(gl.getUniformLocation(program, uniform), unit);
}

/** Owns the renderer, clock, and browser event handlers for one canvas. */
class CelestialScene {
  /** @param {HTMLCanvasElement} canvas @param {WebGLRenderingContext} gl */
  constructor(canvas, gl) {
    this.canvas = canvas;
    this.gl = gl;
    this.motion = matchMedia("(prefers-reduced-motion: reduce)");
    this.paused = this.motion.matches;
    this.lost = false;
    this.frame = 0;
    this.lastTime = 0;
    this.elapsed = 0;
    this.program = null;
    this.resolution = null;
    this.time = null;

    this.onFrame = this.onFrame.bind(this);
    this.onResize = () => this.resize();
    this.onVisibilityChange = () => this.updatePlayback();
    this.onMotionChange = (event) => {
      this.paused = event.matches;
      this.updatePlayback();
    };
    this.onKeyDown = (event) => {
      if (event.code !== "Space" || event.repeat) return;
      event.preventDefault();
      this.paused = !this.paused;
      this.updatePlayback();
    };
    this.onContextLost = (event) => {
      event.preventDefault();
      this.lost = true;
      this.updatePlayback();
    };
    this.onContextRestored = () => {
      this.lost = false;
      try {
        this.initialize();
      } catch (error) {
        this.fail(error);
      }
    };
  }

  /** Create GL resources. Called again after a lost context is restored. */
  initialize() {
    const { gl } = this;
    this.program = createProgram(gl);
    gl.useProgram(this.program);
    bindFullscreenTriangle(gl, this.program);
    const images = [
      ringTexture(0),
      ringTexture(1),
      ringTexture(2),
      ringTexture(3),
      landTexture(),
    ];
    images.forEach((image, unit) =>
      uploadTexture(gl, this.program, image, unit, TEXTURES[unit]),
    );
    this.resolution = gl.getUniformLocation(this.program, "u_resolution");
    this.time = gl.getUniformLocation(this.program, "u_time");
    this.resize();
    this.updatePlayback();
  }

  resize() {
    const ratio = Math.min(
      devicePixelRatio || 1,
      CONFIG.maxPixelRatio,
      Math.sqrt(CONFIG.maxPixels / (innerWidth * innerHeight)),
    );
    this.canvas.width = Math.max(1, Math.round(innerWidth * ratio));
    this.canvas.height = Math.max(1, Math.round(innerHeight * ratio));
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    if (!this.lost && this.program) this.render();
  }

  render() {
    this.gl.uniform2f(this.resolution, this.canvas.width, this.canvas.height);
    this.gl.uniform1f(this.time, this.elapsed);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
  }

  /** @param {DOMHighResTimeStamp} now */
  onFrame(now) {
    if (this.lastTime)
      this.elapsed +=
        Math.min((now - this.lastTime) / 1000, 0.05) * CONFIG.timeScale;
    this.lastTime = now;
    this.render();
    this.frame = requestAnimationFrame(this.onFrame);
  }

  updatePlayback() {
    cancelAnimationFrame(this.frame);
    this.lastTime = 0;
    if (!this.paused && !document.hidden && !this.lost) {
      this.frame = requestAnimationFrame(this.onFrame);
    }
  }

  mount() {
    this.initialize();
    window.addEventListener("resize", this.onResize);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    window.addEventListener("keydown", this.onKeyDown);
    this.motion.addEventListener("change", this.onMotionChange);
    this.canvas.addEventListener("webglcontextlost", this.onContextLost);
    this.canvas.addEventListener(
      "webglcontextrestored",
      this.onContextRestored,
    );
  }

  unmount() {
    cancelAnimationFrame(this.frame);
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    window.removeEventListener("keydown", this.onKeyDown);
    this.motion.removeEventListener("change", this.onMotionChange);
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    this.canvas.removeEventListener(
      "webglcontextrestored",
      this.onContextRestored,
    );
  }

  /** @param {unknown} error */
  fail(error) {
    console.error(error);
    this.unmount();
    showError(
      this.canvas,
      "The celestial scene could not start. Please try a browser with WebGL support.",
    );
  }
}

/** @param {HTMLCanvasElement} canvas */
export async function mountScene(canvas) {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    powerPreference: "high-performance",
  });
  if (!gl) {
    showError(canvas, "This scene needs a browser with WebGL enabled.");
    return;
  }
  try {
    await document.fonts.load("16px CelestialScript", "אבגדהוזחט");
    new CelestialScene(canvas, gl).mount();
  } catch (error) {
    console.error(error);
    showError(
      canvas,
      "The celestial scene could not start. Please reload the page.",
    );
  }
}
