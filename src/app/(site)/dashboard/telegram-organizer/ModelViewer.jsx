'use client'

import React, { useEffect, useRef } from 'react';

// Visor 3D mínimo en WebGL (sin librerías): STL (binario o ASCII) y OBJ.
// Arrastrar = girar, rueda = zoom, doble clic = vista inicial.

// ─── Parsers: devuelven posiciones sin indexar (3 vértices por triángulo) ───
const parseSTL = (buffer) => {
  const dv = new DataView(buffer);
  if (buffer.byteLength >= 84) {
    const count = dv.getUint32(80, true);
    if (84 + count * 50 === buffer.byteLength) {
      const pos = new Float32Array(count * 9);
      for (let i = 0; i < count; i++) {
        const base = 84 + i * 50 + 12; // salta la normal: se recalcula
        for (let j = 0; j < 9; j++) pos[i * 9 + j] = dv.getFloat32(base + j * 4, true);
      }
      return pos;
    }
  }
  const text = new TextDecoder().decode(buffer);
  const re = /vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g;
  const out = [];
  let m;
  while ((m = re.exec(text))) out.push(+m[1], +m[2], +m[3]);
  return new Float32Array(out.length - (out.length % 9));
};

const parseOBJ = (buffer) => {
  const text = new TextDecoder().decode(buffer);
  const verts = [];
  const out = [];
  for (const line of text.split('\n')) {
    if (line.startsWith('v ')) {
      const p = line.trim().split(/\s+/);
      verts.push([+p[1], +p[2], +p[3]]);
    } else if (line.startsWith('f ')) {
      const idx = line.trim().split(/\s+/).slice(1).map(t => {
        const i = parseInt(t, 10);
        return i < 0 ? verts.length + i : i - 1;
      });
      for (let k = 1; k + 1 < idx.length; k++) {
        for (const i of [idx[0], idx[k], idx[k + 1]]) {
          const v = verts[i] || [0, 0, 0];
          out.push(v[0], v[1], v[2]);
        }
      }
    }
  }
  return new Float32Array(out);
};

const faceNormals = (pos) => {
  const n = new Float32Array(pos.length);
  for (let i = 0; i < pos.length; i += 9) {
    const ax = pos[i + 3] - pos[i], ay = pos[i + 4] - pos[i + 1], az = pos[i + 5] - pos[i + 2];
    const bx = pos[i + 6] - pos[i], by = pos[i + 7] - pos[i + 1], bz = pos[i + 8] - pos[i + 2];
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;
    for (let k = 0; k < 9; k += 3) { n[i + k] = nx; n[i + k + 1] = ny; n[i + k + 2] = nz; }
  }
  return n;
};

// ─── Matrices 4x4 (column-major) ───
const mul = (a, b) => {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = s;
  }
  return o;
};
const ident = () => { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; };
const translate = (x, y, z) => { const m = ident(); m[12] = x; m[13] = y; m[14] = z; return m; };
const scale = (s) => { const m = ident(); m[0] = m[5] = m[10] = s; return m; };
const rotX = (a) => { const m = ident(), c = Math.cos(a), s = Math.sin(a); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; };
const rotY = (a) => { const m = ident(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; };
const perspective = (fovy, aspect, near, far) => {
  const f = 1 / Math.tan(fovy / 2), m = new Float32Array(16);
  m[0] = f / aspect; m[5] = f; m[10] = (far + near) / (near - far); m[11] = -1; m[14] = (2 * far * near) / (near - far);
  return m;
};

const VS = `
attribute vec3 aPos; attribute vec3 aNormal;
uniform mat4 uMV; uniform mat4 uP;
varying vec3 vN;
void main() { vN = mat3(uMV) * aNormal; gl_Position = uP * uMV * vec4(aPos, 1.0); }`;
const FS = `
precision mediump float;
varying vec3 vN;
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  float key = max(dot(n, normalize(vec3(0.4, 0.7, 0.6))), 0.0);
  float fill = max(dot(n, normalize(vec3(-0.6, -0.2, 0.4))), 0.0);
  vec3 base = vec3(0.78, 0.80, 0.84);
  gl_FragColor = vec4(base * (0.22 + 0.68 * key + 0.25 * fill), 1.0);
}`;

const compile = (gl, type, src) => {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
};

export const parseModel = (buffer, ext) => (ext === 'obj' ? parseOBJ(buffer) : parseSTL(buffer));

export default function ModelViewer({ positions, zUp }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl', { antialias: true });
    if (!gl || !positions?.length) return;

    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const bind = (data, attr) => {
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, attr);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
      return buf;
    };
    const posBuf = bind(positions, 'aPos');
    const nrmBuf = bind(faceNormals(positions), 'aNormal');
    const uMV = gl.getUniformLocation(prog, 'uMV');
    const uP = gl.getUniformLocation(prog, 'uP');

    // Centro y radio del modelo para encuadrarlo
    let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < positions.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        const v = positions[i + k];
        if (v < min[k]) min[k] = v;
        if (v > max[k]) max[k] = v;
      }
    }
    const center = [0, 1, 2].map(k => (min[k] + max[k]) / 2);
    const radius = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2 || 1;
    const base = mul(zUp ? rotX(-Math.PI / 2) : ident(), mul(scale(1 / radius), translate(-center[0], -center[1], -center[2])));

    const initial = { yaw: -0.6, pitch: 0.35, dist: 2.6 };
    const view = { ...initial };
    const count = positions.length / 3;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
      gl.clearColor(0.06, 0.07, 0.1, 1);
      gl.enable(gl.DEPTH_TEST);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const mv = mul(translate(0, 0, -view.dist), mul(rotX(view.pitch), mul(rotY(view.yaw), base)));
      gl.uniformMatrix4fv(uMV, false, mv);
      gl.uniformMatrix4fv(uP, false, perspective(Math.PI / 4, w / h, 0.01, 100));
      gl.drawArrays(gl.TRIANGLES, 0, count);
    };

    let raf = 0;
    const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };

    let drag = null;
    const onDown = (e) => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); };
    const onMove = (e) => {
      if (!drag) return;
      view.yaw += (e.clientX - drag.x) * 0.01;
      view.pitch = Math.max(-1.55, Math.min(1.55, view.pitch + (e.clientY - drag.y) * 0.01));
      drag = { x: e.clientX, y: e.clientY };
      schedule();
    };
    const onUp = () => { drag = null; };
    const onWheel = (e) => {
      e.preventDefault();
      view.dist = Math.max(0.3, Math.min(20, view.dist * (e.deltaY > 0 ? 1.1 : 0.9)));
      schedule();
    };
    const onDbl = () => { Object.assign(view, initial); schedule(); };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('dblclick', onDbl);
    const ro = new ResizeObserver(schedule);
    ro.observe(canvas);
    schedule();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('dblclick', onDbl);
      gl.deleteBuffer(posBuf);
      gl.deleteBuffer(nrmBuf);
      gl.deleteProgram(prog);
    };
  }, [positions, zUp]);

  return <canvas ref={canvasRef} className="model-canvas" />;
}
