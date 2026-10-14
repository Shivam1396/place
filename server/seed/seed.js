require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');
const User = require('../models/User');

/* ------------------------------------------------------------------ *
 *  Question bank: 100+ questions for each of aptitude / dsa / core / verbal
 *  Numeric questions are GENERATED (answers are computed, so always correct).
 *  Concept questions are handwritten.  Options are shuffled with a fixed seed,
 *  so every run produces the same bank.
 * ------------------------------------------------------------------ */

// ---------- helpers ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260101);
const pick = (a) => a[Math.floor(rand() * a.length)];
const shuffle = (a) => {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const frac = (n, d) => { const g = gcd(n, d); return `${n / g}/${d / g}`; };
const nCr = (n, r) => { let x = 1; for (let i = 1; i <= r; i++) x = (x * (n - r + i)) / i; return Math.round(x); };
const nPr = (n, r) => { let x = 1; for (let i = 0; i < r; i++) x *= n - i; return x; };

const SERVICE = ['TCS', 'Infosys', 'Wipro', 'Accenture'];
const PRODUCT = ['Amazon', 'Google'];
// Service companies get easy->medium(+) questions, product companies medium->hard.
const tagsFor = (d) => {
  const t = [];
  if (d <= 1.5) t.push(...SERVICE);
  if (d >= -1) t.push(...PRODUCT);
  return t;
};

// 3 plausible wrong numbers. pos: true (>0) | 'nn' (>=0) | false (any); dec: allow decimals
function wrongsNum(c, fmt = String, extras = [], { pos = true, dec = false } = {}) {
  const out = [];
  const seen = new Set([fmt(c)]);
  const add = (v) => {
    if (!Number.isFinite(v)) return;
    if (dec) v = +v.toFixed(2); else if (!Number.isInteger(v)) return;
    if (pos === true && v <= 0) return;
    if (pos === 'nn' && v < 0) return;
    const s = fmt(v);
    if (seen.has(s)) return;
    seen.add(s); out.push(s);
  };
  extras.forEach(add);
  const s = Math.max(1, Math.round(Math.abs(c) * 0.1));
  shuffle([c + s, c - s, c + 2 * s, c - 2 * s, c * 2, c + 1, c - 1, c + 3 * s, Math.round(c * 1.5), c / 2, c + 5, c - 5, c * 3]).forEach(add);
  for (let k = 1; out.length < 3 && k < 50; k++) add(c + k * 8);
  return out.slice(0, 3);
}

const clampD = (d) => Math.max(-2, Math.min(2, Math.round(d * 10) / 10));

function make(topic, text, correct, wrongs, diff, explanation) {
  const opts = [correct, ...wrongs].map(String);
  if (new Set(opts).size !== 4) throw new Error('Bad/duplicate options in: ' + text + ' -> ' + opts.join(' | '));
  const sh = shuffle(opts);
  const d = clampD(diff);
  return { topic, text, options: sh, answerIndex: sh.indexOf(String(correct)), difficulty: d, companyTags: tagsFor(d), explanation };
}

// handwritten rows: [question, correct, wrong1, wrong2, wrong3, difficulty, (explanation)]
const H = (topic, rows) => rows.map(([q, c, w1, w2, w3, d, e]) => make(topic, q, c, [w1, w2, w3], d, e || `Correct answer: ${c}`));

// collector that drops duplicate question texts
function collector() {
  const seen = new Set(); const list = [];
  return {
    add(q) { if (!seen.has(q.text)) { seen.add(q.text); list.push(q); } },
    list,
  };
}
const jit = (lo, hi) => lo + rand() * (hi - lo);

/* ============================ APTITUDE ============================ */
function buildAptitude() {
  const C = collector();
  const T = 'aptitude';

  // Percentages
  const pcts = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75];
  const pairs = [];
  pcts.forEach((p) => { for (let n = 40; n <= 1000; n += 40) pairs.push([p, n]); });
  shuffle(pairs).slice(0, 18).forEach(([p, n]) => {
    const a = (p * n) / 100;
    C.add(make(T, `What is ${p}% of ${n}?`, a, wrongsNum(a), jit(-2, -1.2), `${p}/100 x ${n} = ${a}`));
  });

  // Speed = distance / time
  shuffle([[8, 5], [12, 6], [15, 4], [18, 5], [20, 6], [25, 8], [30, 10], [14, 10], [16, 12], [22, 5], [9, 15], [28, 4]]).forEach(([s, t]) => {
    const L = s * t;
    C.add(make(T, `A train ${L} m long passes a pole in ${t} s. Its speed is?`, `${s} m/s`, wrongsNum(s, (v) => `${v} m/s`), jit(-1.5, -0.5), `Speed = ${L}/${t} = ${s} m/s`));
  });
  shuffle([[40, 3], [60, 4], [45, 5], [50, 6], [72, 2], [35, 4], [55, 3], [65, 2]]).forEach(([s, t]) => {
    C.add(make(T, `A car covers ${s * t} km in ${t} hours. Its average speed?`, `${s} km/h`, wrongsNum(s, (v) => `${v} km/h`), jit(-1.8, -1), `${s * t}/${t} = ${s} km/h`));
  });
  // Train crossing a platform
  [[10, 20, 100], [15, 30, 150], [20, 25, 200], [25, 20, 250], [10, 35, 100], [15, 40, 300], [20, 30, 100], [25, 30, 150]].forEach(([s, T2, L]) => {
    const P = s * T2 - L;
    C.add(make(T, `A ${L} m long train running at ${s} m/s crosses a ${P} m platform. Time taken?`, `${T2} s`, wrongsNum(T2, (v) => `${v} s`), jit(0, 0.6), `(${L}+${P})/${s} = ${T2} s`));
  });

  // Time and work
  [[10, 15, 6], [12, 6, 4], [20, 30, 12], [12, 24, 8], [30, 45, 18], [8, 8, 4], [20, 5, 4], [40, 60, 24], [18, 9, 6], [36, 18, 12],
   [24, 24, 12], [15, 30, 10], [14, 35, 10], [21, 28, 12], [60, 40, 24], [45, 90, 30], [16, 48, 12], [28, 21, 12], [9, 18, 6], [30, 60, 20]].forEach(([a, b, t]) => {
    C.add(make(T, `A can finish a job in ${a} days and B in ${b} days. Working together they take (in days)?`, t, wrongsNum(t, String, [Math.round((a + b) / 2)]), jit(-0.5, 0.6), `1/${a} + 1/${b} = 1/${t}`));
  });

  // Profit / loss
  shuffle([100, 200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000]).slice(0, 8).forEach((cp) => {
    const p = pick([10, 20, 25, 30, 40, 50]); const sp = (cp * (100 + p)) / 100;
    C.add(make(T, `An article bought for Rs ${cp} is sold at a profit of ${p}%. Selling price?`, `Rs ${sp}`, wrongsNum(sp, (v) => `Rs ${v}`, [cp + p]), jit(-0.8, 0), `${cp} x ${100 + p}/100 = ${sp}`));
  });
  shuffle([100, 200, 400, 500, 800, 1000, 1200, 2000]).slice(0, 6).forEach((cp) => {
    const l = pick([10, 20, 25, 30, 40]); const sp = (cp * (100 - l)) / 100;
    C.add(make(T, `A shopkeeper buys an item for Rs ${cp} and sells it at a loss of ${l}%. Selling price?`, `Rs ${sp}`, wrongsNum(sp, (v) => `Rs ${v}`, [cp - l]), jit(-0.8, 0), `${cp} x ${100 - l}/100 = ${sp}`));
  });

  // Simple interest
  for (let i = 0; i < 40 && C.list.length < 400; i++) {
    const P = pick([1000, 1500, 2000, 2500, 3000, 4000, 5000, 8000]); const R = pick([4, 5, 6, 8, 10, 12]); const t = pick([2, 3, 4, 5]);
    const si = (P * R * t) / 100;
    C.add(make(T, `Simple interest on Rs ${P} at ${R}% per annum for ${t} years?`, `Rs ${si}`, wrongsNum(si, (v) => `Rs ${v}`), jit(-1.2, -0.2), `SI = PRT/100 = ${si}`));
    if (C.list.filter((q) => q.text.startsWith('Simple interest')).length >= 15) break;
  }
  // Compound interest (2 years)
  shuffle([[2000, 5], [2000, 10], [2000, 20], [4000, 5], [4000, 10], [4000, 20], [6000, 10], [6000, 20], [8000, 5], [8000, 10], [10000, 10], [10000, 20]]).forEach(([P, r]) => {
    const ci = (P * r * (200 + r)) / 10000; const si = (P * r * 2) / 100;
    C.add(make(T, `Compound interest on Rs ${P} at ${r}% per annum for 2 years (compounded yearly)?`, `Rs ${ci}`, wrongsNum(ci, (v) => `Rs ${v}`, [si]), jit(0.8, 1.4), `P[(1+r/100)^2 - 1] = ${ci}`));
  });

  // Averages
  let guard = 0;
  while (C.list.filter((q) => q.text.startsWith('Find the average')).length < 10 && guard++ < 100) {
    const avg = 12 + Math.floor(rand() * 48);
    const dev = [0, 0, 0, 0].map(() => Math.floor(rand() * 17) - 8);
    dev.push(-dev.reduce((a, b) => a + b, 0));
    const nums = shuffle(dev.map((d) => avg + d));
    C.add(make(T, `Find the average of ${nums.join(', ')}.`, avg, wrongsNum(avg), jit(-1.5, -0.8), `Sum / 5 = ${avg}`));
  }

  // Ratios
  const rat = [[2, 3], [3, 5], [1, 4], [3, 4], [2, 5], [4, 5], [5, 7]];
  shuffle(rat.flatMap((r) => [4, 6, 8, 10, 12, 15, 20].map((k) => [r, k]))).slice(0, 12).forEach(([[a, b], k]) => {
    const N = k * (a + b); const big = k * Math.max(a, b);
    C.add(make(T, `Divide ${N} in the ratio ${a}:${b}. The larger share is?`, big, wrongsNum(big, String, [k * Math.min(a, b)]), jit(-0.5, 0.3), `${N}/${a + b} = ${k} per part; larger = ${big}`));
  });

  // Number series
  for (let i = 0; i < 6; i++) {
    const s = 1 + Math.floor(rand() * 20), d = 2 + Math.floor(rand() * 8);
    const t = [0, 1, 2, 3, 4].map((x) => s + x * d); const nxt = s + 5 * d;
    C.add(make(T, `Next in series: ${t.join(', ')}, ?`, nxt, wrongsNum(nxt, String, [nxt + 1, nxt - 1]), jit(-1.5, -0.8), `Common difference ${d}`));
  }
  for (let i = 0; i < 5; i++) {
    const s = 1 + Math.floor(rand() * 4), r = 2 + Math.floor(rand() * 2);
    const t = [0, 1, 2, 3].map((x) => s * r ** x); const nxt = s * r ** 4;
    C.add(make(T, `Next in series: ${t.join(', ')}, ?`, nxt, wrongsNum(nxt, String, [t[3] + (t[3] - t[2])]), jit(-0.5, 0.3), `Each term is multiplied by ${r}`));
  }
  [['2, 6, 12, 20, 30', 42, 'n(n+1): 6 x 7', 1.0], ['2, 5, 10, 17, 26', 37, 'n^2 + 1: 6^2 + 1', 1.0], ['1, 8, 27, 64, 125', 216, 'Cubes: 6^3', 0.6],
   ['1, 1, 2, 3, 5, 8', 13, 'Fibonacci: 5 + 8', 0.5], ['2, 3, 5, 7, 11, 13', 17, 'Prime numbers', 0.6], ['1, 3, 6, 10, 15', 21, 'Triangular numbers', 0.6],
   ['0, 3, 8, 15, 24', 35, 'n^2 - 1: 6^2 - 1', 1.2], ['1, 3, 7, 15, 31', 63, 'Double + 1', 1.0], ['3, 6, 11, 18, 27', 38, 'n^2 + 2: 6^2 + 2', 1.6]].forEach(([s, a, e, d]) => {
    C.add(make(T, `Next in series: ${s}, ?`, a, wrongsNum(a, String, [a + 1, a - 1]), d, e));
  });

  // Probability: two dice
  for (let k = 2; k <= 12; k++) {
    const ways = 6 - Math.abs(7 - k); const c = frac(ways, 36);
    const others = [...new Set([2, 3, 4, 5, 6, 7, 8].filter((x) => x !== k && x !== 14 - k).map((x) => frac(6 - Math.abs(7 - x), 36)))].filter((x) => x !== c);
    const wr = shuffle([...others, '1/4', '1/3']).filter((x) => x !== c).slice(0, 3);
    C.add(make(T, `Two fair dice are rolled. Probability that the sum is ${k}?`, c, wr, 0.4 + Math.abs(7 - k) * 0.15, `${ways} favourable outcomes out of 36`));
  }
  // Probability: coins
  [3, 4, 5].forEach((n) => { for (let k = 1; k < n; k++) {
    const c = frac(nCr(n, k), 2 ** n);
   const wr = shuffle([...new Set(['1/2', '1/4', '1/3', '3/4', frac(nCr(n, k) + 1, 2 ** n), frac(nCr(n, k) * 2, 2 ** n)])]).filter((x) => x !== c).slice(0, 3);
    C.add(make(T, `A fair coin is tossed ${n} times. Probability of exactly ${k} head${k > 1 ? 's' : ''}?`, c, wr, 0.4 + n * 0.15, `C(${n},${k}) / 2^${n}`));
  } });

  // Permutations & combinations
  [[5, 2], [6, 2], [6, 3], [7, 3], [8, 3], [8, 4], [10, 2], [10, 3], [9, 4], [12, 2]].forEach(([n, r]) => {
    const a = nCr(n, r);
    C.add(make(T, `In how many ways can ${r} students be chosen from ${n}?`, a, wrongsNum(a, String, [nPr(n, r)]), 0.2 + r * 0.2, `C(${n},${r}) = ${a}`));
  });
  [[5, 2], [6, 3], [7, 2], [5, 3], [6, 2], [8, 3], [7, 3]].forEach(([n, r]) => {
    const a = nPr(n, r);
    C.add(make(T, `How many ${r}-letter arrangements (no repetition) can be made from ${n} distinct letters?`, a, wrongsNum(a, String, [nCr(n, r)]), 0.5 + r * 0.25, `P(${n},${r}) = ${a}`));
  });

  // Average speed (return journey)
  [5, 10, 15, 20, 25].forEach((k) => {
    const v = 2.4 * k, am = 2.5 * k;
    C.add(make(T, `A man travels a distance at ${2 * k} km/h and returns at ${3 * k} km/h. Average speed for the whole trip?`, `${v} km/h`, wrongsNum(v, (x) => `${x} km/h`, [am], { dec: true }), jit(1, 1.8), `2ab/(a+b) = ${v}`));
  });
  [10, 20, 30, 40].forEach((k) => {
    const v = 1.5 * k, am = 2 * k;
    C.add(make(T, `A cyclist goes at ${k} km/h and comes back at ${3 * k} km/h. Average speed for the round trip?`, `${v} km/h`, wrongsNum(v, (x) => `${x} km/h`, [am], { dec: true }), jit(1, 1.8), `2ab/(a+b) = ${v}`));
  });

  // Successive percentage change
  const ch = [10, 20, 25, 30, 40, 50];
  shuffle(ch.flatMap((a) => ch.filter((b) => b !== a).map((b) => [a, b]))).slice(0, 12).forEach(([a, b]) => {
    const net = +(a - b - (a * b) / 100).toFixed(2);
    const f = (v) => `${v > 0 ? '+' : ''}${+Number(v).toFixed(2)}%`;
    C.add(make(T, `A price is increased by ${a}% and then decreased by ${b}%. Net change?`, f(net), wrongsNum(net, f, [a - b], { pos: false, dec: true }), jit(0.5, 1.2), `Net = ${a} - ${b} - (${a}x${b})/100 = ${net}%`));
  });

  // HCF / LCM
  const cop = [[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [5, 6], [3, 7], [2, 7]];
  shuffle(cop.flatMap((c) => [2, 3, 4, 6, 9, 12].map((g) => [c, g]))).slice(0, 16).forEach(([[m, n], g], i) => {
    const a = g * m, b = g * n;
    if (i % 2) { const l = g * m * n; C.add(make(T, `LCM of ${a} and ${b}?`, l, wrongsNum(l, String, [g, a * b]), jit(-0.4, 0.4), `LCM = ${a} x ${b} / HCF = ${l}`)); }
    else C.add(make(T, `HCF of ${a} and ${b}?`, g, wrongsNum(g, String, [m * n * g]), jit(-0.8, 0), `HCF = ${g}`));
  });

  // Linear equations
  guard = 0;
  while (C.list.filter((q) => q.text.startsWith('If ') && q.text.includes('find x')).length < 10 && guard++ < 100) {
    const a = 2 + Math.floor(rand() * 8), b = 1 + Math.floor(rand() * 20), x = 2 + Math.floor(rand() * 14);
    C.add(make(T, `If ${a}x + ${b} = ${a * x + b}, find x.`, x, wrongsNum(x), jit(-1.8, -1.2), `x = (${a * x + b} - ${b}) / ${a} = ${x}`));
  }
  return C.list;
}

/* ============================== DSA =============================== */
function buildDSA() {
  const C = collector();
  const T = 'dsa';
  H(T, [
    ['Time complexity of binary search on a sorted array?', 'O(log n)', 'O(n)', 'O(n log n)', 'O(1)', -2, 'Each step halves the search space'],
    ['Which data structure follows LIFO?', 'Stack', 'Queue', 'Heap', 'Graph', -2],
    ['Which data structure follows FIFO?', 'Queue', 'Stack', 'Tree', 'Set', -2],
    ['Index of the first element in a C/Java array?', '0', '1', '-1', 'Depends on size', -2],
    ['Time to access an array element by index?', 'O(1)', 'O(n)', 'O(log n)', 'O(n^2)', -1.8],
    ['Worst-case time of linear search?', 'O(n)', 'O(1)', 'O(log n)', 'O(n^2)', -1.8],
    ['Maximum number of children of a node in a binary tree?', '2', '1', '3', 'Unlimited', -2],
    ['Which traversal of a BST yields sorted order?', 'Inorder', 'Preorder', 'Postorder', 'Level order', -1.5],
    ['Which data structure is used for BFS?', 'Queue', 'Stack', 'Heap', 'Hash table', -1.5],
    ['Which data structure is used for iterative DFS?', 'Stack', 'Queue', 'Priority queue', 'Set', -1.5],
    ['Worst-case time of bubble sort?', 'O(n^2)', 'O(n)', 'O(n log n)', 'O(log n)', -1.5],
    ['In a min-heap, the root holds?', 'The smallest element', 'The largest element', 'The median', 'Any element', -1.5],
    ['Which of these is NOT a linear data structure?', 'Tree', 'Array', 'Stack', 'Queue', -1.3],
    ['Which data structure is best for implementing undo?', 'Stack', 'Queue', 'Heap', 'Graph', -1.3],
    ['Time to insert at the head of a singly linked list?', 'O(1)', 'O(n)', 'O(log n)', 'O(n^2)', -1.2],
    ['Which traversal visits the root before its children?', 'Preorder', 'Inorder', 'Postorder', 'None of these', -1.2],
    ['Which data structure is used to evaluate postfix expressions?', 'Stack', 'Queue', 'Tree', 'Heap', -1],
    ['Which traversal visits the root after both children?', 'Postorder', 'Preorder', 'Inorder', 'Level order', -1],
    ['Best-case time of bubble sort with an early-exit flag?', 'O(n)', 'O(n^2)', 'O(log n)', 'O(n log n)', -1],
    ['Average-case time of quicksort?', 'O(n log n)', 'O(n^2)', 'O(n)', 'O(log n)', -1],
    ['Worst-case time of quicksort?', 'O(n^2)', 'O(n log n)', 'O(n)', 'O(log n)', -0.8, 'Bad pivots give unbalanced partitions'],
    ['Time complexity of merge sort in all cases?', 'O(n log n)', 'O(n^2)', 'O(n)', 'O(log n)', -0.8],
    ['Which data structure is typically used to implement a priority queue?', 'Heap', 'Stack', 'Linked list queue', 'Hash map', -0.8],
    ['Average insert time in a hash table with a good hash function?', 'O(1)', 'O(n)', 'O(log n)', 'O(n log n)', -0.5],
    ['Which algorithm finds shortest paths with non-negative weights from one source?', 'Dijkstra', 'Kruskal', 'Prim', 'Topological sort', -0.5],
    ['Time to find the minimum in a min-heap?', 'O(1)', 'O(log n)', 'O(n)', 'O(n log n)', -0.6],
    ['Time to reverse a singly linked list iteratively?', 'O(n)', 'O(1)', 'O(log n)', 'O(n^2)', -0.6],
    ['A tree with n nodes has how many edges?', 'n-1', 'n', 'n+1', '2n', -0.5],
    ['Space complexity of merge sort on arrays?', 'O(n)', 'O(1)', 'O(log n)', 'O(n^2)', -0.5],
    ['Which structure allows insertion/removal at both ends?', 'Deque', 'Stack', 'Heap', 'Set', -0.4],
    ['Best-case time of insertion sort?', 'O(n)', 'O(n^2)', 'O(log n)', 'O(n log n)', -0.3],
    ['Time to insert into a binary heap?', 'O(log n)', 'O(1)', 'O(n)', 'O(n log n)', -0.2],
    ['Height of a balanced BST with n nodes?', 'O(log n)', 'O(n)', 'O(1)', 'O(n log n)', -0.2],
    ['Collision handling that keeps a list per bucket?', 'Chaining', 'Linear probing', 'Double hashing', 'Rehashing only', -0.2],
    ['Space of an adjacency matrix for V vertices?', 'O(V^2)', 'O(V+E)', 'O(E)', 'O(V)', -0.2],
    ['Space used by in-place iterative reversal of a linked list?', 'O(1)', 'O(n)', 'O(log n)', 'O(n^2)', 0],
    ['Worst-case search time in an unbalanced BST?', 'O(n)', 'O(log n)', 'O(1)', 'O(n log n)', 0],
    ['Which algorithm builds an MST by sorting edges?', 'Kruskal', 'Dijkstra', 'Bellman-Ford', 'Floyd-Warshall', 0],
    ['Time complexity of BFS on an adjacency list?', 'O(V+E)', 'O(V^2)', 'O(E log V)', 'O(V E)', 0],
    ['Which sort is NOT stable in its typical implementation?', 'Heap sort', 'Merge sort', 'Insertion sort', 'Bubble sort', 0.2],
    ['Number of edges in a complete undirected graph with n vertices?', 'n(n-1)/2', 'n^2', 'n(n+1)/2', 'n-1', 0.3],
    ['Topological sort is defined for?', 'Directed acyclic graphs', 'Undirected graphs', 'Any directed graph', 'Complete graphs only', 0.2],
    ['Which algorithm handles negative edge weights from a single source?', 'Bellman-Ford', 'Dijkstra', 'Prim', 'Kruskal', 0.3],
    ['Floyd-Warshall solves?', 'All-pairs shortest paths', 'Single-source shortest path', 'Minimum spanning tree', 'Topological ordering', 0.4],
    ['Which technique does 0/1 knapsack typically use?', 'Dynamic programming', 'Greedy algorithm', 'Binary search', 'Divide only', 0.3],
    ['Which data structure is best for prefix searches on strings?', 'Trie', 'Heap', 'Stack', 'AVL tree', 0.4],
    ['Detect a cycle in a linked list in O(1) extra space?', 'Floyd tortoise-hare', 'Hash set of nodes', 'Sorting the nodes', 'Recursion', 0.5],
    ['Minimum number of edges in a connected graph with n vertices?', 'n-1', 'n', 'n+1', 'n/2', 0.5],
    ['Which index structure do most relational databases use by default?', 'B+ tree', 'Trie', 'Stack', 'Binary heap', 0.5],
    ['Kadane\'s algorithm solves?', 'Maximum subarray sum', 'Shortest path', 'Minimum spanning tree', 'String matching', 0.5],
    ['Recurrence T(n) = T(n/2) + 1 gives?', 'O(log n)', 'O(n)', 'O(1)', 'O(n log n)', 0.5],
    ['Time complexity of Floyd-Warshall?', 'O(V^3)', 'O(V^2)', 'O(V E)', 'O(E log V)', 0.6],
    ['A balance factor allowed in an AVL tree node is?', '-1, 0 or 1', '0 only', '1 or 2', 'Any integer', 0.6],
    ['Naive recursive Fibonacci has which time complexity?', 'Exponential', 'Linear', 'Logarithmic', 'Quadratic', 0.6],
    ['Sliding window is typically used for?', 'Subarray/substring problems', 'Graph colouring', 'Tree balancing', 'Hash collisions', 0.6],
    ['Which probing causes primary clustering?', 'Linear probing', 'Double hashing', 'Chaining', 'Quadratic probing', 0.6],
    ['Time complexity of LCS of strings of lengths m and n with DP?', 'O(mn)', 'O(m+n)', 'O(2^n)', 'O(m log n)', 0.7],
    ['Which problem is solved optimally by a greedy approach?', 'Fractional knapsack', '0/1 knapsack', 'Longest common subsequence', 'Matrix chain multiplication', 0.8],
    ['Which structure supports efficient union and find?', 'Disjoint set (union-find)', 'Heap', 'Trie', 'Queue', 0.8],
    ['KMP algorithm is used for?', 'Pattern matching', 'Sorting', 'Graph traversal', 'Hashing', 0.9],
    ['Which sort runs in O(n+k) for integers in range k?', 'Counting sort', 'Quick sort', 'Heap sort', 'Selection sort', 0.9],
    ['Time of Dijkstra with a binary heap?', 'O((V+E) log V)', 'O(V^3)', 'O(V E)', 'O(E)', 1],
    ['Rotation for a left-heavy node whose left child is left-heavy?', 'Right rotation', 'Left rotation', 'Left-Right rotation', 'Right-Left rotation', 1],
    ['Space of recursive DFS on a tree of height h?', 'O(h)', 'O(1)', 'O(n^2)', 'O(log h)', 1],
    ['Which tree keeps all leaves at the same level?', 'B-tree', 'Plain BST', 'Binary heap', 'Trie', 1.1],
    ['Master theorem: T(n) = 2T(n/2) + n gives?', 'O(n log n)', 'O(n)', 'O(n^2)', 'O(log n)', 1.1],
    ['Amortized cost of push in a doubling dynamic array?', 'O(1)', 'O(log n)', 'O(n)', 'O(n^2)', 1.2],
    ['Time to build a trie for total length L of all words?', 'O(L)', 'O(L^2)', 'O(L log L)', 'O(1)', 1.2],
    ['Time to build a binary heap from n elements (heapify)?', 'O(n)', 'O(n log n)', 'O(log n)', 'O(n^2)', 1.4],
    ['Selection sort performs at most how many swaps?', 'n-1', 'n^2', 'n log n', '0', 1.3],
    ['Which structure implements an LRU cache efficiently?', 'Hash map + doubly linked list', 'Stack + queue', 'Binary heap', 'Trie', 1.3],
    ['Lower bound of comparison-based sorting?', 'Omega(n log n)', 'Omega(n)', 'Omega(log n)', 'Omega(n^2)', 1.5],
    ['Time complexity of KMP matching (text n, pattern m)?', 'O(n+m)', 'O(nm)', 'O(n log m)', 'O(n^2)', 1.5],
    ['Median of a data stream is maintained using?', 'Two heaps', 'A single stack', 'A trie', 'A queue', 1.6],
    ['Segment tree range-query time?', 'O(log n)', 'O(n)', 'O(1)', 'O(n log n)', 1.7],
    ['Tarjan\'s algorithm finds?', 'Strongly connected components', 'Shortest paths', 'Minimum spanning tree', 'Median', 1.7],
    ['Which problem is NP-complete?', 'Travelling salesman (decision version)', 'Sorting', 'Binary search', 'Finding the maximum', 1.8],
    ['Best structure for sliding-window maximum in O(n)?', 'Monotonic deque', 'Stack', 'Min-heap', 'Trie', 1.9],
  ]).forEach((q) => C.add(q));

  // Binary search comparisons
  [7, 15, 16, 31, 32, 63, 64, 127, 128, 255, 256, 1000, 1024].forEach((n) => {
    const a = Math.floor(Math.log2(n)) + 1;
    C.add(make(T, `Maximum number of comparisons for binary search on a sorted array of ${n} elements?`, a, wrongsNum(a, String, [a - 1, a + 1]), 0.4 + a * 0.08, `floor(log2 ${n}) + 1 = ${a}`));
  });
  // Max nodes in binary tree
  for (let h = 2; h <= 9; h++) {
    const a = 2 ** (h + 1) - 1;
    C.add(make(T, `Maximum number of nodes in a binary tree of height ${h} (root at height 0)?`, a, wrongsNum(a, String, [2 ** h, 2 ** (h + 1)]), 0 + h * 0.1, `2^(h+1) - 1 = ${a}`));
  }
  // Full binary tree leaves
  [4, 5, 7, 9, 10, 12, 15, 20].forEach((n) => {
    C.add(make(T, `A full binary tree has ${n} internal nodes. How many leaf nodes does it have?`, n + 1, wrongsNum(n + 1, String, [n, 2 * n]), 0.3 + n * 0.02, 'Leaves = internal nodes + 1'));
  });
  // Edges in complete graph
  for (let n = 4; n <= 12; n++) {
    const a = (n * (n - 1)) / 2;
    C.add(make(T, `Number of edges in a complete graph with ${n} vertices?`, a, wrongsNum(a, String, [n * n, n * (n + 1) / 2]), -0.2 + n * 0.05, `n(n-1)/2 = ${a}`));
  }
  // Heap indices (0-indexed)
  for (let i = 1; i <= 9; i++) {
    C.add(make(T, `In a 0-indexed array-based binary heap, what is the index of the left child of the node at index ${i}?`, 2 * i + 1, wrongsNum(2 * i + 1, String, [2 * i, 2 * i + 2, i + 1], { pos: 'nn' }), 0 + i * 0.05, 'Left child = 2i + 1'));
  }
  for (let i = 3; i <= 12; i++) {
    const p = Math.floor((i - 1) / 2);
    C.add(make(T, `In a 0-indexed array-based binary heap, what is the index of the parent of the node at index ${i}?`, p, wrongsNum(p, String, [Math.floor(i / 2), i - 1, p + 1], { pos: 'nn' }), 0 + i * 0.04, 'Parent = floor((i-1)/2)'));
  }
  // Stack and queue simulations
  for (const kind of ['stack', 'queue']) {
    let made = 0, tries = 0;
    while (made < 9 && tries++ < 200) {
      const vals = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]); let vi = 0; const ops = []; const ds = [];
      const len = 6 + Math.floor(rand() * 3);
      for (let i = 0; i < len; i++) {
        if (ds.length > 0 && rand() < 0.35) { ops.push(kind === 'stack' ? 'pop' : 'dequeue'); kind === 'stack' ? ds.pop() : ds.shift(); }
        else { const v = vals[vi++]; ops.push(`${kind === 'stack' ? 'push' : 'enqueue'} ${v}`); ds.push(v); }
      }
      if (!ds.length) continue;
      const ans = kind === 'stack' ? ds[ds.length - 1] : ds[0];
      const wr = new Set(vals.slice(0, vi).filter((v) => v !== ans).map(String));
      wrongsNum(ans).forEach((w) => wr.add(w));
      const text = `Operations on an empty ${kind}: ${ops.join(', ')}. What is at the ${kind === 'stack' ? 'top' : 'front'} now?`;
      const before = C.list.length;
      C.add(make(T, text, ans, shuffle([...wr]).slice(0, 3), 0.1 + rand() * 0.8, `Simulate the operations: ${kind === 'stack' ? 'top' : 'front'} = ${ans}`));
      if (C.list.length > before) made++;
    }
  }
  return C.list;
}

/* ============================== CORE ============================== */
function buildCore() {
  const C = collector();
  const T = 'core';
  H(T, [
    ['What does CPU stand for?', 'Central Processing Unit', 'Central Program Unit', 'Core Processing Utility', 'Computer Primary Unit', -2],
    ['Which gate outputs 1 only when both inputs are 1?', 'AND', 'OR', 'XOR', 'NAND', -1.8],
    ['Which SQL command adds a new row?', 'INSERT', 'ADD ROW', 'APPEND', 'UPDATE', -1.5],
    ['Which SQL command modifies existing rows?', 'UPDATE', 'MODIFY', 'ALTER ROW', 'CHANGE', -1.4],
    ['Which SQL statement removes a table entirely?', 'DROP TABLE', 'DELETE', 'TRUNCATE ROWS', 'REMOVE TABLE', -1.5],
    ['Which key uniquely identifies each row of a table?', 'Primary key', 'Foreign key', 'Index', 'View', -1.5],
    ['In ACID, what does "A" stand for?', 'Atomicity', 'Availability', 'Associativity', 'Authorization', -1.5],
    ['Which memory is the fastest?', 'Registers', 'Cache', 'RAM', 'Hard disk', -1.5],
    ['Which OOP concept lets a subclass reuse a parent class?', 'Inheritance', 'Encapsulation', 'Compilation', 'Overflow', -1.5],
    ['HTTP status code for "Not Found"?', '404', '200', '500', '301', -1.5],
    ['Which SQL function counts rows?', 'COUNT()', 'SUM()', 'TOTAL()', 'ROWS()', -1.8],
    ['What does DNS stand for?', 'Domain Name System', 'Data Network Service', 'Domain Node Server', 'Dynamic Name Socket', -1.6],
    ['IPv4 address length?', '32 bits', '64 bits', '128 bits', '16 bits', -1.5],
    ['Which keyword removes duplicate rows in SELECT?', 'DISTINCT', 'UNIQUE ROWS', 'DIFFERENT', 'NODUP', -1.3],
    ['In ACID, what does "I" stand for?', 'Isolation', 'Integrity', 'Inheritance', 'Indexing', -1.2],
    ['IPv6 address length?', '128 bits', '32 bits', '64 bits', '256 bits', -1.2],
    ['Which join returns only matching rows?', 'INNER JOIN', 'LEFT JOIN', 'FULL OUTER JOIN', 'CROSS JOIN', -1.2],
    ['Which command-line tool tests reachability using ICMP?', 'ping', 'telnet', 'nslookup', 'netstat', -1.2],
    ['Default port of HTTP?', '80', '443', '22', '53', -1.2],
    ['Which SQL clause filters grouped rows?', 'HAVING', 'WHERE', 'GROUP BY', 'ORDER BY', -1, 'HAVING filters aggregates'],
    ['Which protocol translates domain names to IP addresses?', 'DNS', 'ARP', 'DHCP', 'FTP', -1],
    ['Which scheduling algorithm uses a time quantum?', 'Round Robin', 'FCFS', 'SJF', 'Non-preemptive priority', -1],
    ['Which constraint prevents NULL values?', 'NOT NULL', 'UNIQUE', 'CHECK', 'DEFAULT', -1],
    ['Which OS component loads the OS at startup?', 'Bootloader', 'Shell', 'Compiler', 'Scheduler', -1],
    ['A foreign key is used to?', 'Link two tables', 'Sort rows', 'Encrypt data', 'Speed up every query', -1],
    ['Which language is compiled by default?', 'C', 'Python', 'JavaScript', 'Bash', -1],
    ['Which join returns all rows from the left table plus matches from the right?', 'LEFT JOIN', 'INNER JOIN', 'RIGHT JOIN', 'CROSS JOIN', -0.8],
    ['Default port of HTTPS?', '443', '80', '21', '25', -0.8],
    ['Cache memory sits between?', 'CPU and RAM', 'RAM and disk', 'Disk and network', 'CPU and ALU', -0.8],
    ['Which data structure holds OS scheduling queues?', 'Queue', 'Stack', 'Tree', 'Graph', -0.8],
    ['Which protocol is connectionless?', 'UDP', 'TCP', 'Both TCP and UDP', 'Neither', -0.8],
    ['Which layer of the OSI model performs routing?', 'Network', 'Transport', 'Data link', 'Session', -0.2],
    ['Default port of SSH?', '22', '23', '21', '25', -0.6],
    ['Which protocol is used to send email?', 'SMTP', 'POP3', 'IMAP', 'FTP', -0.6],
    ['Which memory area stores local variables of a function?', 'Stack', 'Heap', 'Code segment', 'Data segment', -0.5],
    ['Which memory area stores dynamically allocated objects?', 'Heap', 'Stack', 'Register', 'ROM', -0.5],
    ['TCP connection establishment uses?', 'Three-way handshake', 'Two-way handshake', 'Four-way handshake', 'No handshake', -0.5],
    ['Which layer of OSI does TCP belong to?', 'Transport', 'Network', 'Session', 'Application', -0.5],
    ['Which SQL command grants privileges?', 'GRANT', 'ALLOW', 'PERMIT', 'GIVE', -0.5],
    ['Hexadecimal of decimal 255?', 'FF', 'EE', 'FE', '1F', -0.6],
    ['Which status code means "Internal Server Error"?', '500', '404', '403', '502', -1],
    ['Which system call creates a process in Unix?', 'fork()', 'exec()', 'wait()', 'exit()', -0.3],
    ['Which gate is universal?', 'NAND', 'AND', 'OR', 'XOR', -0.3],
    ['A memory leak is?', 'Unreleased memory that is no longer used', 'Memory overwritten by another process', 'A cache miss', 'A page fault', -0.2],
    ['Virtual memory allows?', 'Running programs larger than physical RAM', 'Faster disk', 'Bigger cache', 'No page faults ever', -0.2],
    ['Subnet mask for /24?', '255.255.255.0', '255.255.0.0', '255.255.255.128', '255.0.0.0', -0.2],
    ['An abstract class cannot be?', 'Instantiated', 'Inherited', 'Given methods', 'Given fields', -0.3],
    ['Which keyword stops a Java class from being inherited?', 'final', 'static', 'abstract', 'private', -0.2],
    ['Which scheduling gives minimum average waiting time (non-preemptive)?', 'SJF', 'FCFS', 'Round Robin', 'Priority', 0],
    ['Which scheduling algorithm can cause starvation?', 'Priority scheduling', 'Round Robin', 'FCFS', 'None of these', 0, 'Low-priority processes may wait forever'],
    ['Which protocol maps IP addresses to MAC addresses?', 'ARP', 'DNS', 'DHCP', 'ICMP', 0],
    ['Which device works at the Network layer?', 'Router', 'Hub', 'Repeater', 'Bridge', 0],
    ['Method overloading is an example of?', 'Compile-time polymorphism', 'Runtime polymorphism', 'Inheritance', 'Encapsulation', 0],
    ['Method overriding is an example of?', 'Runtime polymorphism', 'Compile-time polymorphism', 'Overloading', 'Data hiding only', 0],
    ['Coffman conditions: how many are needed for deadlock?', '4', '2', '3', '5', -0.2],
    ['A semaphore with value 0 means?', 'Resource unavailable; callers block', 'All resources are free', 'Deadlock exists', 'Process terminated', 0.3],
    ['MongoDB is which type of NoSQL database?', 'Document store', 'Key-value store', 'Column family', 'Graph database', -0.2],
    ['Which normal form removes partial dependency?', '2NF', '1NF', '3NF', 'BCNF', 0.2],
    ['Which header field limits packet lifetime in IPv4?', 'TTL', 'MTU', 'ToS', 'Checksum', 0.4],
    ['Which isolation problem reads uncommitted data?', 'Dirty read', 'Phantom read', 'Lost update only', 'Deadlock', 0.4],
    ['Paging eliminates which fragmentation?', 'External fragmentation', 'Internal fragmentation', 'Both', 'Neither', 0.5],
    ['Banker\'s algorithm is used for?', 'Deadlock avoidance', 'Page replacement', 'CPU scheduling', 'Disk scheduling', 0.5],
    ['Which transaction state follows a successful COMMIT?', 'Committed', 'Aborted', 'Partially committed', 'Active', 0.5],
    ['Which normal form removes transitive dependency?', '3NF', '1NF', '2NF', '4NF', 0.6, '3NF removes transitive dependency'],
    ['Which routing protocol is distance-vector?', 'RIP', 'OSPF', 'IS-IS', 'LDP', 0.6],
    ['Which routing protocol is link-state?', 'OSPF', 'RIP', 'Static routing', 'ARP', 0.6],
    ['Thrashing occurs when?', 'Excessive paging collapses CPU utilization', 'The CPU is idle with no processes', 'The disk is full', 'The cache is flushed', 0.8],
    ['Which HTTP method is idempotent and fully replaces a resource?', 'PUT', 'POST', 'PATCH', 'CONNECT', 0.7],
    ['Round Robin with a very large quantum behaves like?', 'FCFS', 'SJF', 'Priority', 'LRU', 1],
    ['CAP theorem covers which three properties?', 'Consistency, Availability, Partition tolerance', 'Concurrency, Atomicity, Performance', 'Caching, Availability, Persistence', 'Consistency, Atomicity, Partitioning', 1],
    ['Which page replacement policy can show Belady\'s anomaly?', 'FIFO', 'LRU', 'Optimal', 'All of these', 1.2],
    ['Which normal form needs every determinant to be a candidate key?', 'BCNF', '1NF', '2NF', 'Unnormalized form', 1.1],
    ['Which is NOT a necessary condition for deadlock?', 'Preemption', 'Mutual exclusion', 'Hold and wait', 'Circular wait', 1.3, 'No preemption is the required condition'],
    ['Which locking protocol guarantees conflict serializability?', 'Two-phase locking', 'Single-phase locking', 'Timestamp-free locking', 'Optimistic reads only', 1.4],
  ]).forEach((q) => C.add(q));

  // Usable hosts in a subnet
  for (let n = 24; n <= 30; n++) {
    const tot = 2 ** (32 - n), a = tot - 2;
    C.add(make(T, `How many usable host addresses are there in a /${n} IPv4 subnet?`, a, wrongsNum(a, String, [tot, tot - 1]), 0.4 + (n - 24) * 0.15, `2^(32-${n}) - 2 = ${a}`));
  }
  // Address bus width
  [8, 10, 12, 16, 20, 24].forEach((n) => {
    const a = 2 ** n;
    C.add(make(T, `Maximum number of memory locations addressable with a ${n}-bit address?`, a, wrongsNum(a, String, [2 ** (n - 1), 2 ** (n + 1), 2 * n]), -0.5 + n * 0.05, `2^${n} = ${a}`));
  });
  // Number systems
  [5, 9, 13, 18, 21, 25, 30, 37, 45, 50, 64, 100].forEach((n) => {
    const a = n.toString(2);
    const wr = [...new Set([n + 1, n - 1, n + 2, n - 2, n + 4].map((x) => x.toString(2)))].filter((x) => x !== a).slice(0, 3);
    C.add(make(T, `Binary representation of decimal ${n}?`, a, wr, -1.5 + Math.log2(n) * 0.15, `${n} in binary = ${a}`));
  });
  [6, 11, 14, 19, 27, 42, 53, 77].forEach((n) => {
    C.add(make(T, `Decimal value of binary ${n.toString(2)}?`, n, wrongsNum(n), -1 + Math.log2(n) * 0.15, `Sum of powers of two = ${n}`));
  });
  [['1F', 31], ['2A', 42], ['3C', 60], ['64', 100], ['7F', 127], ['A0', 160], ['B7', 183], ['FF', 255]].forEach(([h, n]) => {
    C.add(make(T, `Decimal value of hexadecimal ${h}?`, n, wrongsNum(n), -0.2 + n / 300, `0x${h} = ${n}`));
  });
  return C.list;
}

/* ============================= VERBAL ============================= */
function buildVerbal() {
  const C = collector();
  const T = 'verbal';
  // [word, synonym, antonym, neutral1, neutral2, difficulty]
  const vocab = [
    ['happy', 'joyful', 'sad', 'narrow', 'central', -2], ['brave', 'courageous', 'cowardly', 'sticky', 'distant', -1.8],
    ['rapid', 'swift', 'slow', 'golden', 'humble', -1.8], ['ancient', 'old', 'modern', 'tasty', 'quiet', -1.7],
    ['enormous', 'huge', 'tiny', 'bitter', 'polish', -1.7], ['begin', 'commence', 'end', 'borrow', 'polish', -1.6],
    ['abundant', 'plentiful', 'scarce', 'fragile', 'cheerful', -1.5], ['silent', 'quiet', 'noisy', 'golden', 'bitter', -1.5],
    ['honest', 'truthful', 'deceitful', 'fragile', 'golden', -1.3], ['difficult', 'arduous', 'easy', 'golden', 'local', -1],
    ['expand', 'enlarge', 'shrink', 'harvest', 'polish', -1], ['victory', 'triumph', 'defeat', 'border', 'harvest', -0.8],
    ['vivid', 'bright', 'dull', 'border', 'fertile', -0.6], ['diligent', 'hardworking', 'lazy', 'shiny', 'distant', -0.6],
    ['conceal', 'hide', 'reveal', 'harvest', 'border', -0.5], ['generous', 'charitable', 'stingy', 'curious', 'smooth', -0.5],
    ['candid', 'frank', 'evasive', 'damp', 'fertile', -0.3], ['hostile', 'unfriendly', 'friendly', 'shallow', 'nimble', -0.3],
    ['reluctant', 'unwilling', 'eager', 'clumsy', 'golden', -0.3], ['benevolent', 'kind', 'malevolent', 'rigid', 'spacious', -0.2],
    ['frugal', 'thrifty', 'extravagant', 'fragile', 'vocal', -0.2], ['meager', 'scanty', 'ample', 'lively', 'rigid', 0],
    ['obsolete', 'outdated', 'current', 'tender', 'bold', 0], ['vague', 'unclear', 'precise', 'fertile', 'dormant', 0],
    ['lethargic', 'sluggish', 'energetic', 'fertile', 'narrow', 0.3], ['futile', 'useless', 'fruitful', 'tender', 'distant', 0.4],
    ['imminent', 'impending', 'distant', 'shallow', 'brittle', 0.4], ['obstinate', 'stubborn', 'flexible', 'radiant', 'shallow', 0.4],
    ['prudent', 'wise', 'reckless', 'shiny', 'golden', 0.5], ['meticulous', 'careful', 'careless', 'nimble', 'tender', 0.8],
    ['lucid', 'clear', 'obscure', 'tender', 'dormant', 0.9], ['ephemeral', 'short-lived', 'permanent', 'fertile', 'radiant', 1],
    ['pragmatic', 'practical', 'idealistic', 'shallow', 'radiant', 1], ['verbose', 'wordy', 'concise', 'brittle', 'radiant', 1],
    ['aloof', 'distant', 'approachable', 'brittle', 'fertile', 1], ['gregarious', 'sociable', 'introverted', 'radiant', 'brittle', 1.1],
    ['scrutinize', 'examine', 'ignore', 'replicate', 'harvest', 1.1], ['ubiquitous', 'omnipresent', 'rare', 'fragile', 'tender', 1.2],
    ['tenacious', 'persistent', 'yielding', 'radiant', 'dormant', 1.2], ['arbitrary', 'random', 'systematic', 'radiant', 'fertile', 1.2],
    ['mitigate', 'alleviate', 'aggravate', 'replicate', 'dominate', 1.3], ['eloquent', 'articulate', 'inarticulate', 'brittle', 'radiant', 1.3],
    ['zenith', 'peak', 'nadir', 'harvest', 'border', 1.4], ['ambiguous', 'equivocal', 'explicit', 'fertile', 'brittle', 1.5],
    ['ostentatious', 'showy', 'modest', 'fertile', 'dormant', 1.6], ['pernicious', 'harmful', 'beneficial', 'radiant', 'dormant', 1.7],
  ];
  vocab.forEach(([w, syn, ant, n1, n2, d]) => {
    C.add(make(T, `Choose the synonym of "${w}":`, syn, [ant, n1, n2], d, `"${w}" means ${syn}`));
    C.add(make(T, `Choose the antonym of "${w}":`, ant, [syn, n1, n2], d + 0.1, `"${w}" is the opposite of ${ant}`));
  });

  // Articles
  [['honest person', 'an', -1.5], ['university student', 'a', -0.5], ['hour', 'an', -0.8], ['umbrella', 'an', -1.8], ['European trip', 'a', 0.2],
   ['MBA degree', 'an', 0.3], ['one-way ticket', 'a', 0], ['heir', 'an', 0.5], ['unicorn', 'a', -1], ['X-ray report', 'an', 0.2],
   ['useful tool', 'a', -1.2], ['orange', 'an', -2], ['user manual', 'a', -0.8], ['honour', 'an', 0.2], ['SQL query', 'an', 0.4],
   ['ugly duckling', 'an', -1], ['unit test', 'a', -0.5], ['eight-hour shift', 'an', -0.4], ['hotel', 'a', -1.2], ['umpire', 'an', -1.4],
   ['utensil', 'a', -0.2], ['honorary degree', 'an', 0.4]].forEach(([p, a, d]) => {
    C.add(make(T, `Choose the correct indefinite article: "___ ${p}"`, a, ['a', 'an', 'the', 'some'].filter((x) => x !== a), d, `The article depends on the first SOUND of "${p}"`));
  });

  H(T, [
    ['Choose the correct sentence.', 'He doesn\'t know the answer.', 'He don\'t know the answer.', 'He doesn\'t knows the answer.', 'He not know the answer.', -1.2],
    ['Fill in: "She ___ to school every day."', 'goes', 'go', 'going', 'gone', -1.8],
    ['Fill in: "They ___ playing football when it rained."', 'were', 'was', 'is', 'be', -1.2],
    ['Fill in: "Mathematics ___ my favourite subject."', 'is', 'are', 'were', 'have', -0.4],
    ['Fill in: "He is good ___ mathematics."', 'at', 'in', 'on', 'with', -0.8],
    ['Fill in: "She is afraid ___ spiders."', 'of', 'from', 'by', 'to', -0.8],
    ['Fill in: "I have ___ finished my homework."', 'already', 'yet', 'ago', 'still', -0.8],
    ['Fill in: "I have been waiting ___ two hours."', 'for', 'since', 'from', 'at', -0.5],
    ['Fill in: "She has been working here ___ 2019."', 'since', 'for', 'from', 'during', -0.3],
    ['Fill in: "The committee ___ its decision yesterday."', 'announced', 'announce', 'have announce', 'announcing', -0.6],
    ['Choose the correctly spelled word.', 'Necessary', 'Neccessary', 'Necesary', 'Neccesary', 0],
    ['Fill in: "She prefers tea ___ coffee."', 'to', 'than', 'over', 'from', 0],
    ['Fill in: "One of my friends ___ a doctor."', 'is', 'are', 'were', 'have been', 0],
    ['Fill in: "The news ___ shocking."', 'was', 'were', 'are', 'have been', 0.2],
    ['Fill in: "Each of the students ___ a laptop."', 'has', 'have', 'are having', 'were', 0.3],
    ['Choose the passive voice of: "They built a bridge."', 'A bridge was built by them.', 'A bridge is built by them.', 'A bridge has built by them.', 'A bridge were built by them.', 0.2],
    ['Fill in: "Neither of the answers ___ correct."', 'is', 'are', 'were', 'be', 0.5, '"Neither" takes a singular verb'],
    ['Choose the indirect speech of: He said, "I am tired."', 'He said that he was tired.', 'He said that I am tired.', 'He said that he is tired yesterday.', 'He said that he were tired.', 0.5],
    ['Choose the correctly spelled word.', 'Accommodate', 'Acommodate', 'Accomodate', 'Acomodate', 0.6],
    ['Fill in: "If I ___ you, I would apply."', 'were', 'was', 'am', 'be', 0.8],
    ['Choose the correctly spelled word.', 'Occurrence', 'Occurence', 'Ocurrence', 'Occurance', 0.9],
    ['Fill in: "He as well as his friends ___ coming."', 'is', 'are', 'were', 'have', 1.2],
    ['Fill in: "Hardly had he arrived ___ it started raining."', 'when', 'than', 'then', 'after', 1.3],
    ['Fill in: "He suggested that she ___ the meeting."', 'attend', 'attends', 'attended', 'attending', 1.6],
  ]).forEach((q) => C.add(q));

  // Idioms: [idiom, meaning, wrong1, wrong2, wrong3, difficulty]
  [['piece of cake', 'Very easy', 'A dessert', 'Very difficult', 'A small share', -1.3], ['break the ice', 'Start a conversation in a tense setting', 'Cool a drink', 'Break something fragile', 'End a friendship', -0.8],
   ['under the weather', 'Feeling ill', 'In a storm', 'Very happy', 'Outdoors', -0.8], ['once in a blue moon', 'Very rarely', 'Every month', 'At night', 'Very often', -0.6],
   ['a blessing in disguise', 'A hidden good', 'A curse', 'A prayer', 'A surprise party', -0.5], ['spill the beans', 'Reveal a secret', 'Waste food', 'Cook badly', 'Start a fight', -0.5],
   ['cost an arm and a leg', 'Be very expensive', 'Cause injury', 'Be free', 'Be cheap', -0.5], ['hit the nail on the head', 'Be exactly right', 'Hurt oneself', 'Make a mistake', 'Work as a carpenter', -0.4],
   ['burn the midnight oil', 'Work late into the night', 'Waste fuel', 'Wake up early', 'Sleep deeply', 0], ['let the cat out of the bag', 'Reveal a secret by mistake', 'Free a pet', 'Cause confusion', 'Make a loud noise', 0],
   ['beat around the bush', 'Avoid the main point', 'Hit a plant', 'Go hunting', 'Speak very loudly', 0.2], ['the ball is in your court', 'It is your turn to act', 'You are winning', 'The game is over', 'You should leave', 0.3],
   ['bite the bullet', 'Endure a painful situation bravely', 'Eat quickly', 'Shoot a gun', 'Avoid a problem', 0.4], ['a storm in a teacup', 'A big fuss over a small matter', 'A tea party', 'A rare event', 'A dangerous situation', 0.8],
   ['the last straw', 'The final problem that makes things unbearable', 'The best option', 'A cheap drink', 'A first attempt', 0.9], ['burn one\'s bridges', 'Destroy any chance of return', 'Build a road', 'Cross a river', 'Make new friends', 1],
  ].forEach(([i, m, a, b, c, d]) => C.add(make(T, `Meaning of the idiom "${i}":`, m, [a, b, c], d, `"${i}" means: ${m}`)));
  return C.list;
}

/* ============================== SEED ============================== */
const Q = [...buildAptitude(), ...buildDSA(), ...buildCore(), ...buildVerbal()];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to database:', mongoose.connection.name);

  // 1) Questions (done first, independent of the users step)
  await Question.deleteMany({});
  await Question.insertMany(Q);

  const byTopic = {};
  Q.forEach((q) => { byTopic[q.topic] = (byTopic[q.topic] || 0) + 1; });
  console.log('Questions per topic:', byTopic);
  const companies = ['TCS', 'Infosys', 'Wipro', 'Accenture', 'Amazon', 'Google'];
  for (const topic of Object.keys(byTopic)) {
    console.log(`  ${topic}:`, companies.map((c) => `${c}=${Q.filter((q) => q.topic === topic && q.companyTags.includes(c)).length}`).join(' '));
  }

  // 2) Demo users.  FIX: the old unique index on regNo treated every user without
  //    a regNo as regNo:null, so the 2nd such user crashed with E11000.
  try {
    await User.collection.dropIndex('regNo_1');
    console.log('Dropped old regNo_1 index (make regNo "sparse" in your User model, see notes).');
  } catch (e) { /* index doesn't exist or is already gone - fine */ }

  const demoUsers = [
    { name: 'Prof. Rao', email: 'faculty@demo.com', role: 'faculty', regNo: 'FAC-DEMO-001' },
    { name: 'Demo Student', email: 'student@demo.com', role: 'student', regNo: 'STU-DEMO-001' },
  ];
  for (const u of demoUsers) {
    if (!(await User.findOne({ email: u.email }))) {
      await User.create({ ...u, password: 'password123', department: 'AI&DS', batch: 2026, cgpa: 7.8 });
    }
  }

  console.log(`Seeded ${Q.length} questions + demo users (faculty@demo.com / student@demo.com, password: password123)`);
  process.exit(0);
})().catch((err) => { console.error('Seed failed:', err); process.exit(1); });
