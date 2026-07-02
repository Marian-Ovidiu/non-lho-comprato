import { round2 } from "@/src/lib/money-number";
export type ExpenseSuggestionInput = {
  title: string;
  categoryId: string;
  workspaceId: string;
  currentRealCost: number;
  paidByUserId?: string | null;
  beneficiaryUserIds?: string[];
};

export type ExpenseSuggestionCandidate = {
  title: string;
  realCost: number;
  date: Date;
  paidByUserId: string | null;
  beneficiaryUserIds: string[];
};

export type ExpenseSuggestionResult = {
  alternativeCost: number;
  label: string;
  confidence: number;
  evidenceCount: number;
};

const STOP_WORDS = new Set([
  "a",
  "ad",
  "al",
  "alla",
  "allo",
  "ai",
  "agli",
  "alle",
  "anche",
  "che",
  "chi",
  "con",
  "da",
  "dagli",
  "dai",
  "dal",
  "dalla",
  "dello",
  "della",
  "dei",
  "delle",
  "del",
  "di",
  "e",
  "ed",
  "in",
  "il",
  "la",
  "le",
  "lo",
  "nei",
  "nel",
  "nella",
  "nello",
  "per",
  "su",
  "tra",
  "un",
  "una",
  "uno",
  "vs",
  "via",
]);

const IMPORT_NOISE_PATTERNS = [
  /\bimport\w*\b/i,
  /\bcsv\b/i,
  /\bstatement\b/i,
  /\btransaction\b/i,
  /\btxn\b/i,
  /\bpaypal\b/i,
  /\bstripe\b/i,
  /\brevolut\b/i,
  /\bnexi\b/i,
  /\bpos\b/i,
  /\bbank\b/i,
  /\baddebito\b/i,
  /\bbonifico\b/i,
];

const MIN_EVIDENCE_COUNT = 3;
const MIN_COST_GAP_RATIO = 0.15;
const MIN_TITLE_SIMILARITY = 0.12;
const MIN_CONTEXT_SIMILARITY = 0.35;
const MIN_EXPLANATION_STRENGTH = 0.32;
const MAX_CLUSTER_SPREAD_RATIO = 0.45;
const MAX_CLUSTER_UPLIFT_RATIO = 1.15;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function tokenize(value: string): string[] {
  return Array.from(
    new Set(
      normalizeText(value)
        .split(/[^a-z0-9]+/g)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2 && !STOP_WORDS.has(token)),
    ),
  );
}

function jaccardSimilarity(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const leftSet = new Set(left);
  const rightSet = new Set(right);
  let intersection = 0;

  for (const token of leftSet) {
    if (rightSet.has(token)) {
      intersection += 1;
    }
  }

  if (intersection === 0) {
    return 0;
  }

  const union = leftSet.size + rightSet.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function recencyScore(date: Date): number {
  const daysOld = Math.max(
    0,
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysOld <= 30) {
    return 1;
  }

  if (daysOld <= 90) {
    return 0.88;
  }

  if (daysOld <= 180) {
    return 0.7;
  }

  if (daysOld <= 365) {
    return 0.5;
  }

  return 0.35;
}

function contextSimilarity(
  candidate: ExpenseSuggestionCandidate,
  input: ExpenseSuggestionInput,
): number {
  const payerMatch =
    input.paidByUserId && candidate.paidByUserId === input.paidByUserId ? 1 : 0;
  const candidateBeneficiaries = new Set(candidate.beneficiaryUserIds);
  const inputBeneficiaries = new Set(input.beneficiaryUserIds ?? []);

  let beneficiaryIntersection = 0;
  for (const userId of candidateBeneficiaries) {
    if (inputBeneficiaries.has(userId)) {
      beneficiaryIntersection += 1;
    }
  }

  const beneficiaryUnion = new Set([
    ...candidateBeneficiaries,
    ...inputBeneficiaries,
  ]).size;
  const beneficiarySimilarity =
    beneficiaryUnion === 0 ? 1 : beneficiaryIntersection / beneficiaryUnion;

  return payerMatch * 0.6 + beneficiarySimilarity * 0.4;
}

function costSignal(candidateCost: number, currentRealCost: number): number {
  if (!Number.isFinite(candidateCost) || !Number.isFinite(currentRealCost)) {
    return 0;
  }

  if (currentRealCost <= 0) {
    return clamp(candidateCost / Math.max(candidateCost, 1), 0, 1);
  }

  if (candidateCost <= currentRealCost * 1.15) {
    return 0;
  }

  return clamp(
    (candidateCost - currentRealCost) / Math.max(candidateCost, 1),
    0,
    1,
  );
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function scoreCandidate(
  candidate: ExpenseSuggestionCandidate,
  input: ExpenseSuggestionInput,
) {
  const titleSimilarity = jaccardSimilarity(
    tokenize(input.title),
    tokenize(candidate.title),
  );
  const recency = recencyScore(candidate.date);
  const context = contextSimilarity(candidate, input);
  const cost = costSignal(candidate.realCost, input.currentRealCost);

  const score =
    titleSimilarity * 0.12 +
    context * 0.18 +
    recency * 0.2 +
    cost * 0.5;

  return {
    candidate,
    score,
    titleSimilarity,
    recency,
    context,
    cost,
  };
}

function weightedMedian(
  items: Array<{
    value: number;
    weight: number;
  }>,
): number {
  if (items.length === 0) {
    return 0;
  }

  const sorted = [...items].sort((left, right) => left.value - right.value);
  const totalWeight = sorted.reduce((sum, item) => sum + item.weight, 0);

  if (totalWeight <= 0) {
    return sorted[Math.floor(sorted.length / 2)]?.value ?? 0;
  }

  let running = 0;
  for (const item of sorted) {
    running += item.weight;
    if (running >= totalWeight / 2) {
      return item.value;
    }
  }

  return sorted.at(-1)?.value ?? 0;
}

function getLabelToken(titles: string[]): string | null {
  const tokenCounts = new Map<string, number>();

  for (const title of titles) {
    for (const token of tokenize(title)) {
      tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1);
    }
  }

  const rankedTokens = [...tokenCounts.entries()].sort(
    (left, right) => right[1] - left[1] || right[0].length - left[0].length,
  );

  const token = rankedTokens[0]?.[0];
  if (!token) {
    return null;
  }

  if (token.length <= 2) {
    return null;
  }

  return token;
}

function buildLabel(titles: string[], currentTitle: string): string {
  const token = getLabelToken(titles) ?? getLabelToken([currentTitle]);

  if (token) {
    return `${token.charAt(0).toUpperCase()}${token.slice(1)} medio`;
  }

  return "Alternativa media";
}

export function buildExpenseSuggestion(
  candidates: ExpenseSuggestionCandidate[],
  input: ExpenseSuggestionInput,
): ExpenseSuggestionResult | null {
  const scored = candidates
    .filter((candidate) => !IMPORT_NOISE_PATTERNS.some((pattern) => pattern.test(candidate.title)))
    .filter((candidate) => candidate.realCost > input.currentRealCost * 1.15)
    .map((candidate) => scoreCandidate(candidate, input))
    .filter(
      (item) =>
        item.titleSimilarity >= MIN_TITLE_SIMILARITY ||
        item.context >= MIN_CONTEXT_SIMILARITY ||
        item.score >= 0.45,
    )
    .sort((left, right) => right.score - left.score);

  if (scored.length < MIN_EVIDENCE_COUNT) {
    return null;
  }

  const topCandidates = scored.slice(0, 10);
  const anchorCost = weightedMedian(
    topCandidates.map((item) => ({
      value: item.candidate.realCost,
      weight: item.score + 0.1,
    })),
  );

  const tolerance = Math.max(2, anchorCost * 0.2, input.currentRealCost * 0.35);
  const cluster = topCandidates.filter((item) => {
    const distance = Math.abs(item.candidate.realCost - anchorCost);
    return distance <= tolerance || item.score >= 0.8;
  });

  if (cluster.length < MIN_EVIDENCE_COUNT) {
    return null;
  }

  const evidenceCount = cluster.length;
  const alternativeCost = weightedMedian(
    cluster.map((item) => ({
      value: item.candidate.realCost,
      weight: item.score + 0.05,
    })),
  );

  const minCost = Math.min(...cluster.map((item) => item.candidate.realCost));
  const maxCost = Math.max(...cluster.map((item) => item.candidate.realCost));
  const clusterSpreadRatio =
    maxCost > 0 ? (maxCost - minCost) / maxCost : Number.POSITIVE_INFINITY;
  if (clusterSpreadRatio > MAX_CLUSTER_SPREAD_RATIO) {
    return null;
  }

  if (alternativeCost <= input.currentRealCost) {
    return null;
  }

  const minimumAllowedCost =
    input.currentRealCost * (1 + MIN_COST_GAP_RATIO);
  if (alternativeCost < minimumAllowedCost) {
    return null;
  }

  const clusterCap = maxCost * MAX_CLUSTER_UPLIFT_RATIO;
  if (alternativeCost > clusterCap) {
    return null;
  }

  const averageScore = average(cluster.map((item) => item.score));
  const averageTitleSimilarity = average(
    cluster.map((item) => item.titleSimilarity),
  );
  const averageContext = average(cluster.map((item) => item.context));
  const averageSimilarity = average(
    cluster.map((item) => Math.max(item.titleSimilarity, item.context)),
  );
  const averageRecency = average(cluster.map((item) => item.recency));
  const support = clamp(evidenceCount / 6, 0, 1);
  const costStrength = clamp(
    (alternativeCost - input.currentRealCost) / Math.max(alternativeCost, 1),
    0,
    1,
  );
  const explanationStrength =
    averageSimilarity * 0.5 +
    averageTitleSimilarity * 0.15 +
    averageContext * 0.15 +
    averageScore * 0.1 +
    averageRecency * 0.1;

  if (
    averageSimilarity < MIN_TITLE_SIMILARITY &&
    averageContext < MIN_CONTEXT_SIMILARITY
  ) {
    return null;
  }

  if (explanationStrength < MIN_EXPLANATION_STRENGTH) {
    return null;
  }

  const confidence = clamp(
    explanationStrength * 0.45 +
      averageRecency * 0.1 +
      averageScore * 0.05 +
      support * 0.2 +
      costStrength * 0.25,
    0,
    1,
  );

  if (confidence < 0.55) {
    return null;
  }

  return {
    alternativeCost: round2(alternativeCost),
    label: buildLabel(
      cluster.map((item) => item.candidate.title),
      input.title,
    ),
    confidence: round2(confidence),
    evidenceCount,
  };
}
