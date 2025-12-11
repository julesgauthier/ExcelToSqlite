// Simple fuzzy matching utilities for header suggestions
function normalize(s) {
  if (!s) return '';
  return String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokens(s) {
  return normalize(s).split(/\s+/).filter(Boolean);
}

// Returns a score in [0,1]
function tokenOverlapScore(a, b) {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.length === 0 && tb.length === 0) return 1;
  if (ta.length === 0 || tb.length === 0) return 0;

  const setA = new Set(ta);
  const setB = new Set(tb);
  let inter = 0;
  setA.forEach((t) => { if (setB.has(t)) inter += 1; });

  const score = (2 * inter) / (setA.size + setB.size);
  return Math.max(0, Math.min(1, score));
}

function startsWithBonus(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 0.5;
  if (na.startsWith(nb) || nb.startsWith(na)) return 0.25;
  return 0;
}

export function scoreNames(a, b) {
  if (!a || !b) return 0;
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const tscore = tokenOverlapScore(na, nb);
  const bonus = startsWithBonus(na, nb);
  const s = Math.min(1, tscore + bonus);
  return s;
}

// Given a target name and an array of candidate objects with { name }, return
// sorted suggestions [{ name, score }, ...]
export function suggestCandidates(targetName, candidates = []) {
  const res = (candidates || []).map((c) => ({
    name: c.name || c,
    score: scoreNames(targetName, c.name || c),
  }));

  res.sort((a, b) => b.score - a.score);
  return res;
}

export default { scoreNames, suggestCandidates };
