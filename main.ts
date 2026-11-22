// tiny-stack-vm-01 entry: faithful port of the reference VM (generator/subject/vm.mjs).
// Usage: node main.ts [inputDir] [outputDir]  (defaults /input and /output, what the grader uses)
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SM = 256, CM = 64, MM = 256, SL = 1000000, OM = 65536;
const IM = new Int8Array(256).fill(-1), PO = new Uint8Array(256), PU = new Uint8Array(256);
const t = (o: number, i: number, a: number, b: number) => { IM[o] = i; PO[o] = a; PU[o] = b; };
t(0x00, 0, 0, 0); t(0x01, 1, 0, 1); t(0x02, 4, 0, 1); t(0x03, 0, 1, 0); t(0x04, 0, 1, 2);
t(0x05, 0, 2, 2); t(0x06, 0, 2, 3); t(0x07, 0, 3, 3);
for (let o = 0x10; o <= 0x16; o++) t(o, 0, 2, 1);
t(0x17, 0, 1, 1); t(0x18, 0, 2, 1); t(0x19, 0, 2, 1); t(0x1a, 0, 2, 1); t(0x1b, 0, 1, 1);
t(0x1c, 0, 2, 1); t(0x1d, 0, 2, 1); t(0x1e, 0, 2, 1);
t(0x20, 0, 2, 1); t(0x21, 0, 2, 1); t(0x22, 0, 2, 1);
t(0x30, 2, 0, 0); t(0x31, 2, 1, 0); t(0x32, 2, 1, 0); t(0x33, 2, 0, 0); t(0x34, 0, 0, 0);
t(0x40, 0, 1, 1); t(0x41, 0, 2, 0);
t(0x50, 0, 1, 0); t(0x51, 0, 1, 0); t(0x52, 0, 0, 1); t(0x53, 0, 1, 0);

function run(p: Uint8Array, inp: Uint8Array): { s: Uint8Array; c: number } {
  const n = p.length;
  const D = new Int32Array(SM), C = new Int32Array(CM), M = new Int32Array(MM), out = new Uint8Array(OM);
  let sp = 0, csp = 0, olen = 0, ip = 0, pc = 0, st = 0, c = -1;
  for (;;) {
    if (st === SL) { c = 10; break; }
    if (pc < 0 || pc >= n) { c = 9; break; }
    const op = p[pc], im = IM[op];
    if (im < 0) { c = 5; break; }
    if (pc + im >= n) { c = 9; break; }
    st++;
    const nx = pc + 1 + im, po = PO[op], pu = PU[op];
    if (sp < po) { c = 2; break; }
    if (sp - po + pu > SM) { c = 3; break; }
    pc = nx;
    switch (op) {
      case 0x00: c = 0; break;
      case 0x01: D[sp++] = (p[nx - 1] << 24) >> 24; break;
      case 0x02: D[sp++] = p[nx - 4] | (p[nx - 3] << 8) | (p[nx - 2] << 16) | (p[nx - 1] << 24); break;
      case 0x03: sp--; break;
      case 0x04: D[sp] = D[sp - 1]; sp++; break;
      case 0x05: { const x = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = x; break; }
      case 0x06: D[sp] = D[sp - 2]; sp++; break;
      case 0x07: { const x = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = x; break; }
      case 0x17: D[sp - 1] = -D[sp - 1] | 0; break;
      case 0x1b: D[sp - 1] = ~D[sp - 1]; break;
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15: case 0x16:
      case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d: case 0x1e:
      case 0x20: case 0x21: case 0x22: {
        const b = D[sp - 1], a = D[sp - 2];
        let r = 0;
        switch (op) {
          case 0x10: r = (a + b) | 0; break;
          case 0x11: r = (a - b) | 0; break;
          case 0x12: r = Math.imul(a, b); break;
          case 0x13: if (b === 0) { c = 4; break; } r = a === -2147483648 && b === -1 ? a : (a / b) | 0; break;
          case 0x14: if (b === 0) { c = 4; break; } r = b === -1 ? 0 : (a % b) | 0; break;
          case 0x15: if (b === 0) { c = 4; break; } r = Math.floor((a >>> 0) / (b >>> 0)) | 0; break;
          case 0x16: if (b === 0) { c = 4; break; } r = ((a >>> 0) % (b >>> 0)) | 0; break;
          case 0x18: r = a & b; break;
          case 0x19: r = a | b; break;
          case 0x1a: r = a ^ b; break;
          case 0x1c: r = a << (b & 31); break;
          case 0x1d: r = a >> (b & 31); break;
          case 0x1e: r = (a >>> (b & 31)) | 0; break;
          case 0x20: r = a === b ? 1 : 0; break;
          case 0x21: r = a < b ? 1 : 0; break;
          case 0x22: r = (a >>> 0) < (b >>> 0) ? 1 : 0; break;
        }
        if (c >= 0) break;
        sp -= 2; D[sp++] = r;
        break;
      }
      case 0x30: case 0x31: case 0x32: {
        const rel = ((p[nx - 2] | (p[nx - 1] << 8)) << 16) >> 16;
        let take = true;
        if (op !== 0x30) { const v = D[--sp]; take = op === 0x31 ? v === 0 : v !== 0; }
        if (take) pc = nx + rel;
        break;
      }
      case 0x33: if (csp === CM) { c = 7; break; } C[csp++] = nx; pc = p[nx - 2] | (p[nx - 1] << 8); break;
      case 0x34: if (csp === 0) { c = 8; break; } pc = C[--csp]; break;
      case 0x40: { const a = D[sp - 1]; if (a < 0 || a >= MM) { c = 6; break; } D[sp - 1] = M[a]; break; }
      case 0x41: {
        const a = D[sp - 1], v = D[sp - 2];
        if (a < 0 || a >= MM) { c = 6; break; }
        sp -= 2; M[a] = v; break;
      }
      case 0x50: {
        const b = String(D[sp - 1]);
        if (olen + b.length > OM) { c = 11; break; }
        sp--;
        for (let k = 0; k < b.length; k++) out[olen++] = b.charCodeAt(k);
        break;
      }
      case 0x51: if (olen + 1 > OM) { c = 11; break; } out[olen++] = D[--sp] & 255; break;
      case 0x52: D[sp++] = ip < inp.length ? inp[ip++] : -1; break;
      case 0x53: c = D[--sp] & 255; break;
    }
    if (c >= 0) break;
  }
  return { s: out.slice(0, olen), c };
}

const I = process.argv[2] ?? '/input', O = process.argv[3] ?? '/output';
const ids = readdirSync(I, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
for (const id of ids) {
  const d = join(I, id);
  const r = run(new Uint8Array(readFileSync(join(d, 'program.bin'))), new Uint8Array(readFileSync(join(d, 'input.bin'))));
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), r.s);
  writeFileSync(join(O, id, 'exit.txt'), String(r.c) + '\n');
}
