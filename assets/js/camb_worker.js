// Runs CAMB (assets/wasm/camb.mjs, built by CAMB web/build_wasm.py) off the main thread.
// Message in:  {params: [H0, ombh2, omch2, mnu, As, ns, tau, YHe], nonlinear: bool}
// Message out: {zs, dists: {DA, DL, chi, H}, kh, pk, ells, cls: {TT, EE, BB, TE}, seconds} or {error}
import createCamb from "../wasm/camb.mjs";

const lmax = 2500, nk = 200, minkh = 1e-4, maxkh = 10, nz = 300;
const zs = Array.from({ length: nz }, (_, i) => (3 * i) / (nz - 1));
const kh = Array.from({ length: nk }, (_, i) => minkh * (maxkh / minkh) ** (i / (nk - 1)));

let M = null;

async function load() {
  M = await createCamb({ print: () => {}, printErr: (s) => console.warn(s) });
}

function run(params, nonlinear) {
  const sizes = [8, nz, 4 * nz, nk, 4 * (lmax + 1)];
  const ptrs = sizes.map((n) => M._malloc(8 * n));
  const [pPar, pZ, pD, pPk, pCl] = ptrs;
  const heap = (ptr, n) => M.HEAPF64.subarray(ptr / 8, ptr / 8 + n);
  try {
    heap(pPar, 8).set(params);
    heap(pZ, nz).set(zs);
    const t = performance.now();
    const err = M._camb_wasm_run(pPar, nonlinear ? 1 : 0, nz, pZ, pD, minkh, maxkh, nk, pPk, lmax, pCl);
    const seconds = (performance.now() - t) / 1000;
    if (err !== 0) return { error: `CAMB returned error code ${err}` };
    // Fortran column-major: dists(4, nz), cls(4, 0:lmax); copy out before the heap can change
    const d = Array.from(heap(pD, 4 * nz));
    const c = Array.from(heap(pCl, 4 * (lmax + 1)));
    const col = (arr, stride, j, start = 0) => arr.filter((_, i) => i % stride === j).slice(start);
    return {
      zs,
      dists: { DA: col(d, 4, 0), DL: col(d, 4, 1), chi: col(d, 4, 2), H: col(d, 4, 3) },
      kh,
      pk: Array.from(heap(pPk, nk)),
      ells: Array.from({ length: lmax - 1 }, (_, i) => i + 2),
      cls: { TT: col(c, 4, 0, 2), EE: col(c, 4, 1, 2), BB: col(c, 4, 2, 2), TE: col(c, 4, 3, 2) },
      seconds,
    };
  } finally {
    ptrs.forEach((p) => M._free(p));
  }
}

const ready = load();

onmessage = async ({ data }) => {
  await ready;
  try {
    postMessage(run(data.params, data.nonlinear));
  } catch (e) {
    // A Fortran "stop" aborts the wasm instance: report it and start a fresh one
    postMessage({ error: `CAMB aborted (${e.message || e}); check the parameter values.` });
    await load();
  }
};
