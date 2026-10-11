/* Vendored from the roflow repo (flow/src/app/core/carve.ts) — Ronak's own
 * code, copied so the portfolio ticker demo can generate real puzzles.
 * Upstream may evolve; this snapshot is intentionally frozen. */
/* Sequential carving generator for hex boards (and any topology where
 * Hamiltonian cutting tangles): place endpoint pairs one by one, connecting
 * them with induced paths through free cells until the board is filled.
 * Every committed path is touch-free by construction, so all boards are
 * solvable with clean flows. Framework-free and type-strippable. */

import { analyzeCut, scoreClean, seededRng } from './flow-generator';
import type { Cell, CutInfo, Rng } from './flow-generator';
import type { Topology } from './topology';

export interface CarvedBoard {
  pairs: [Cell, Cell][];
  solution: Cell[][];
}

const TRIES_PER_FLOW = 10;
const PATH_BUDGET = 400;

function toRC(topo: Topology, k: number): Cell {
  return [Math.floor(k / topo.cols), k % topo.cols];
}

function emptiesOf(topo: Topology, grid: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < grid.length; i++) if (grid[i] === -1) out.push(i);
  return out;
}

function regionsOf(topo: Topology, grid: number[]): number[][] {
  const seen = new Set<number>();
  const out: number[][] = [];
  for (let s = 0; s < grid.length; s++) {
    if (grid[s] !== -1 || seen.has(s)) continue;
    const comp: number[] = [];
    const q = [s];
    seen.add(s);
    while (q.length) {
      const cur = q.pop() as number;
      comp.push(cur);
      const [r, c] = toRC(topo, cur);
      for (const [nr, nc] of topo.neighbors(r, c)) {
        const k = topo.key(nr, nc);
        if (!seen.has(k) && grid[k] === -1) {
          seen.add(k);
          q.push(k);
        }
      }
    }
    out.push(comp);
  }
  return out;
}

function shuffledNeighbors(topo: Topology, r: number, c: number, rng: Rng): Cell[] {
  const nbs = topo.neighbors(r, c).slice();
  for (let i = nbs.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = nbs[i];
    nbs[i] = nbs[j];
    nbs[j] = t;
  }
  return nbs;
}

/** Randomized DFS for an induced a->b path through empty cells. Length is
 *  kept within [loLen, hiLen]; both endpoints keep degree 1. */
function findInducedPath(
  topo: Topology, grid: number[], a: number, b: number, rng: Rng,
  budget: number, loLen: number, hiLen: number,
): Cell[] | null {
  const [ar, ac] = toRC(topo, a);
  const [br, bc] = toRC(topo, b);
  const path: Cell[] = [[ar, ac]];
  const inPath = new Set<number>([a]);
  let used = 0;
  const stack: Array<{ nbs: Cell[]; i: number }> = [{ nbs: shuffledNeighbors(topo, ar, ac, rng), i: 0 }];
  const touchesPathExcept = (r: number, c: number, hr: number, hc: number): boolean => {
    for (const [nr, nc] of topo.neighbors(r, c)) {
      const k = topo.key(nr, nc);
      if (inPath.has(k) && !(nr === hr && nc === hc)) return true;
    }
    return false;
  };
  while (stack.length > 0) {
    if (++used > budget) return null;
    const [hr, hc] = path[path.length - 1];
    const top = stack[stack.length - 1];
    if (top.i >= top.nbs.length) {
      const [pr, pc] = path.pop() as Cell;
      inPath.delete(topo.key(pr, pc));
      stack.pop();
      continue;
    }
    const [nr, nc] = top.nbs[top.i++];
    const k = topo.key(nr, nc);
    if (k === b) {
      const nl = path.length + 1;
      if (nl < loLen || nl > hiLen) continue;
      let bad = false;
      for (const [qr, qc] of topo.neighbors(br, bc)) {
        const qk = topo.key(qr, qc);
        if (inPath.has(qk) && !(qr === hr && qc === hc)) {
          bad = true;
          break;
        }
      }
      if (bad) continue;
      return path.concat([[nr, nc]]);
    }
    if (inPath.has(k) || grid[k] !== -1) continue;
    if (touchesPathExcept(nr, nc, hr, hc)) continue;
    if (path.length + 1 > hiLen) continue;
    if (path.length + 1 + topo.distance([nr, nc], [br, bc]) > hiLen) continue;
    if (path.length >= 2 && topo.neighbors(nr, nc).some(([x, y]) => x === ar && y === ac)) continue;
    path.push([nr, nc]);
    inPath.add(k);
    stack.push({ nbs: shuffledNeighbors(topo, nr, nc, rng), i: 0 });
  }
  return null;
}

interface CarveState {
  topo: Topology;
  grid: number[];
  flows: Cell[][];
  minLen: number;
  maxLen: number;
  kMin: number;
  kMax: number;
  triesPerFlow: number;
  pathBudget: number;
  rng: Rng;
  attempts: { count: number; max: number };
}

function carveOnce(st: CarveState): Cell[][] | null {
  const { topo, grid, flows, minLen, maxLen, kMin, kMax, triesPerFlow, pathBudget, rng } = st;
  const commit = (path: Cell[], ci: number): void => {
    for (const [r, c] of path) grid[topo.key(r, c)] = ci;
  };
  const uncommit = (path: Cell[]): void => {
    for (const [r, c] of path) grid[topo.key(r, c)] = -1;
  };
  const regionsOk = (): boolean =>
    regionsOf(topo, grid).every((rg) => rg.length === 0 || rg.length >= minLen);

  function place(depth: number): boolean {
    const regs = regionsOf(topo, grid).filter((rg) => rg.length > 0);
    if (regs.length === 0) return flows.length >= kMin && flows.length <= kMax;
    if (flows.length > kMax || depth > 30) return false;
    regs.sort((x, y) => x.length - y.length);
    const region = regs[0];
    const hiLen = Math.min(maxLen, region.length);
    if (hiLen < minLen) return false;
    for (let t = 0; t < triesPerFlow; t++) {
      const a = region[Math.floor(rng() * region.length)];
      const [ar, ac] = toRC(topo, a);
      const cands = region.filter((k) => {
        if (k === a) return false;
        const d = topo.distance([ar, ac], toRC(topo, k));
        return d >= 3 && d <= hiLen - 1;
      });
      if (cands.length === 0) continue;
      const b = cands[Math.floor(rng() * cands.length)];
      if (++st.attempts.count > st.attempts.max) return false;
      const path = findInducedPath(topo, grid, a, b, rng, pathBudget, minLen, hiLen);
      if (!path) continue;
      commit(path, flows.length);
      if (!regionsOk()) {
        uncommit(path);
        continue;
      }
      flows.push(path);
      if (place(depth + 1)) return true;
      flows.pop();
      uncommit(path);
    }
    return false;
  }

  return place(0) ? flows : null;
}

export interface CarveOptions {
  timeBudgetMs?: number;
  triesPerFlow?: number;
  pathBudget?: number;
  /** Accepted pair-count window is [numPairs-kSlack, numPairs+kSlack]. */
  kSlack?: number;
  /** Salt the RNG stream (deterministic retries get fresh draws). */
  salt?: string;
  /** Skip the shape gate (straights/border veto); validity gates stay. */
  relaxShape?: boolean;
  /** Total findPath attempts across restarts (deterministic work bound). */
  maxAttempts?: number;
}

/** Carve a full-coverage partition of induced paths. Best valid board wins;
 *  null when the budget runs out (caller falls back). Deterministic per seed. */
export function carveLevel(
  seed: string, topo: Topology, numPairs: number, opts: CarveOptions = {},
): CarvedBoard | null {
  const rng = seededRng(`${String(seed)}::carve${opts.salt ?? ''}`);
  const total = topo.total;
  const avg = total / numPairs;
  const minLen = Math.max(4, Math.floor(avg * 0.5));
  const maxLen = Math.ceil(avg * 1.7);
  const kMin = Math.max(2, numPairs - (opts.kSlack ?? 2));
  const kMax = numPairs + (opts.kSlack ?? 2);
  const triesPerFlow = opts.triesPerFlow ?? TRIES_PER_FLOW;
  const pathBudget = opts.pathBudget ?? PATH_BUDGET;
  const t0 = Date.now();
  const timeBudget = opts.timeBudgetMs ?? 1200;
  const maxAttempts = opts.maxAttempts ?? 20000;
  const attempts = { count: 0, max: maxAttempts };

  let best: Cell[][] | null = null;
  let bestScore = -Infinity;
  let successes = 0;
  // Fixed restart count + score exits keep output deterministic; the time
  // budget is only a pathological safety net (it essentially never binds).
  for (let rs = 0; rs < 12; rs++) {
    if (Date.now() - t0 > timeBudget) break;
    const grid = new Array<number>(total).fill(-1);
    const st: CarveState = {
      topo, grid, flows: [], minLen, maxLen, kMin, kMax,
      triesPerFlow, pathBudget, rng, attempts,
    };
    const flows = carveOnce(st);
    if (attempts.count >= maxAttempts) break;
    if (!flows) continue;
    const info: CutInfo = analyzeCut(
      flows.flat(),
      topo,
      flows.map((f) => f.length),
    );
    if (info.touches !== 0 || info.mono2x2 !== 0) continue;
    if (!opts.relaxShape && (info.straights > 1 || info.borderStraight > 0)) continue;
    const score = scoreClean(info);
    if (score > bestScore) {
      bestScore = score;
      best = flows;
    }
    successes++;
    if (successes >= 2) break;
    if (score > 1.35 && info.minD >= 3) break;
  }
  if (!best) return null;
  return {
    pairs: best.map((sg): [Cell, Cell] => [[sg[0][0], sg[0][1]], [sg[sg.length - 1][0], sg[sg.length - 1][1]]]),
    solution: best.map((sg) => sg.map((cell): Cell => [cell[0], cell[1]])),
  };
}
