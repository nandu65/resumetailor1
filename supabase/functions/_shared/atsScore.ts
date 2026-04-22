// Deterministic ATS scoring engine.
// Same input -> same output. Different (improved) resume -> different score.
// Used by edge functions and mirrored in the browser tool.

const STOP = new Set([
  "the","a","an","and","or","of","to","in","for","on","with","by","at","as","is","are","be","this","that",
  "from","it","you","we","our","your","their","they","i","but","not","will","can","have","has","had","was",
  "were","into","more","than","such","also","any","all","each","other","its","these","those","may","most",
  "using","use","used","based","across","over","under","about","via","etc","per","up","out","new","work",
  "role","team","job","company","candidate","experience","years","year","strong","ability","including",
  "able","help","make","made","do","does","did","one","two","three"
]);

const ACTION_VERBS = new Set([
  "led","built","launched","designed","developed","created","implemented","delivered","drove","managed",
  "owned","architected","scaled","optimized","optimised","reduced","increased","grew","improved","shipped",
  "automated","streamlined","negotiated","mentored","spearheaded","established","executed","initiated",
  "transformed","accelerated","generated","produced","analyzed","analysed","engineered","orchestrated",
  "championed","pioneered","achieved","exceeded","cut","saved","boosted","tripled","doubled"
]);

const SECTION_PATTERNS: { name: string; re: RegExp }[] = [
  { name: "summary",    re: /\b(summary|profile|objective|about\s+me)\b/i },
  { name: "experience", re: /\b(experience|employment|work\s+history|professional\s+experience)\b/i },
  { name: "education",  re: /\b(education|academic|qualifications)\b/i },
  { name: "skills",     re: /\b(skills|technical\s+skills|competencies|technologies|tech\s+stack)\b/i },
  { name: "projects",   re: /\b(projects|portfolio|selected\s+work)\b/i },
];

function tokens(s: string): string[] {
  return s.toLowerCase()
    .replace(/[^a-z0-9+#./\s-]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP.has(t));
}

function bigrams(toks: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < toks.length - 1; i++) {
    if (!STOP.has(toks[i]) && !STOP.has(toks[i + 1])) out.push(`${toks[i]} ${toks[i + 1]}`);
  }
  return out;
}

function freq(arr: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const x of arr) m.set(x, (m.get(x) || 0) + 1);
  return m;
}

export interface CategoryScore {
  key: string;
  label: string;
  score: number;   // earned
  max: number;     // weight
  detail: string;
}

export interface AtsScoreResult {
  ats_score: number;            // 0-100 weighted total
  recruiter_score: number;      // 0-100 separate signal
  breakdown: CategoryScore[];
  recommendations: string[];
  matched_keywords: string[];
  missing_top_keywords: string[];
}

export function computeAtsScore(resumeText: string, jdText: string): AtsScoreResult {
  const resume = resumeText || "";
  const jd = jdText || "";

  const rTokens = tokens(resume);
  const jTokens = tokens(jd);
  const rSet = new Set(rTokens);
  const rBigramSet = new Set(bigrams(rTokens));

  const jFreq = freq(jTokens);
  const jBigrams = freq(bigrams(jTokens));

  // Top JD unigrams + meaningful bigrams
  const topUnigrams = [...jFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
  const topBigrams = [...jBigrams.entries()].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // ---------- 1. Keyword Match (35) ----------
  let kwEarned = 0;
  let kwWeightSum = 0;
  const matched: string[] = [];
  const missing: string[] = [];
  for (const [w, c] of topUnigrams) {
    const weight = Math.min(3, c); // diminishing
    kwWeightSum += weight;
    if (rSet.has(w)) { kwEarned += weight; matched.push(w); } else { missing.push(w); }
  }
  for (const [bg, c] of topBigrams) {
    const weight = Math.min(2, c);
    kwWeightSum += weight;
    if (rBigramSet.has(bg)) { kwEarned += weight; matched.push(bg); } else { missing.push(bg); }
  }
  const keywordPct = kwWeightSum ? kwEarned / kwWeightSum : 0;
  const keywordScore = Math.round(keywordPct * 35);

  // ---------- 2. Skills Alignment (20) ----------
  const SKILL_HINTS = [
    "python","javascript","typescript","java","golang","rust","sql","nosql","react","node","aws","gcp",
    "azure","docker","kubernetes","terraform","figma","tableau","powerbi","excel","salesforce","hubspot",
    "jira","git","ci/cd","graphql","rest","api","ml","ai","llm","nlp","seo","sem","crm","erp","saas",
    "agile","scrum","kanban","linux","spark","hadoop","kafka","redis","postgres","mysql","mongodb"
  ];
  const jdSkills = SKILL_HINTS.filter(s => jd.toLowerCase().includes(s));
  let skillsEarned = 0;
  if (jdSkills.length === 0) {
    // Fall back: top capitalised tokens in JD
    skillsEarned = 0.6; // neutral
  } else {
    const present = jdSkills.filter(s => resume.toLowerCase().includes(s)).length;
    skillsEarned = present / jdSkills.length;
  }
  const skillsScore = Math.round(skillsEarned * 20);

  // ---------- 3. Experience Relevance (15) ----------
  // Pull role-defining nouns from JD title-area + first 400 chars and check overlap with resume
  const jdHead = jd.slice(0, 600).toLowerCase();
  const headTokens = Array.from(new Set(tokens(jdHead))).slice(0, 25);
  const headHits = headTokens.filter(t => rSet.has(t)).length;
  const headPct = headTokens.length ? headHits / headTokens.length : 0;
  // Years of experience signal
  const jdYearsMatch = jd.match(/(\d+)\+?\s*years?/i);
  const rYearsMatch = resume.match(/(\d+)\+?\s*years?/i);
  let yearsBoost = 0;
  if (jdYearsMatch) {
    const need = parseInt(jdYearsMatch[1], 10);
    const have = rYearsMatch ? parseInt(rYearsMatch[1], 10) : 0;
    yearsBoost = have >= need ? 1 : Math.max(0, have / need);
  } else {
    yearsBoost = 0.7;
  }
  const expPct = headPct * 0.7 + yearsBoost * 0.3;
  const experienceScore = Math.round(expPct * 15);

  // ---------- 4. Resume Structure (10) ----------
  const sectionsFound = SECTION_PATTERNS.filter(p => p.re.test(resume)).map(p => p.name);
  const structPct = sectionsFound.length / SECTION_PATTERNS.length;
  const structureScore = Math.round(structPct * 10);

  // ---------- 5. Impact & Metrics (10) ----------
  const numberHits = (resume.match(/\b\d[\d,.]*\s*(%|percent|x|k|m|million|billion|users|customers|hrs|hours|days)?\b/gi) || []).length;
  const dollarHits = (resume.match(/\$\s?\d/g) || []).length;
  const totalImpact = numberHits + dollarHits * 2;
  // Saturate around 18 impact signals
  const impactPct = Math.min(1, totalImpact / 18);
  const impactScore = Math.round(impactPct * 10);

  // ---------- 6. Readability & Formatting (10) ----------
  const lines = resume.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const bulletLines = lines.filter(l => /^[-•*▪●·]/.test(l));
  const bulletRatio = lines.length ? bulletLines.length / lines.length : 0;
  const avgBulletWords = bulletLines.length
    ? bulletLines.reduce((s, l) => s + l.split(/\s+/).length, 0) / bulletLines.length
    : 0;
  const verbStarts = bulletLines.filter(l => {
    const w = l.replace(/^[-•*▪●·\s]+/, "").split(/\s+/)[0]?.toLowerCase() || "";
    return ACTION_VERBS.has(w);
  }).length;
  const verbRatio = bulletLines.length ? verbStarts / bulletLines.length : 0;
  const lengthOk = avgBulletWords >= 8 && avgBulletWords <= 28 ? 1 : 0.5;
  const readPct = Math.min(1, bulletRatio * 0.5 + verbRatio * 0.4 + lengthOk * 0.1);
  const readabilityScore = Math.round(readPct * 10);

  const breakdown: CategoryScore[] = [
    { key: "keywords",   label: "Keyword Match",       score: keywordScore,    max: 35, detail: `${matched.length} of ${topUnigrams.length + topBigrams.length} important JD terms found` },
    { key: "skills",     label: "Skills Alignment",    score: skillsScore,     max: 20, detail: jdSkills.length ? `${jdSkills.filter(s => resume.toLowerCase().includes(s)).length}/${jdSkills.length} JD skills present` : "No technical skills detected in JD" },
    { key: "experience", label: "Experience Relevance",score: experienceScore, max: 15, detail: `${headHits}/${headTokens.length} role terms aligned${jdYearsMatch ? `, ${rYearsMatch?.[1] || 0}/${jdYearsMatch[1]} yrs` : ""}` },
    { key: "structure",  label: "Resume Structure",    score: structureScore,  max: 10, detail: `${sectionsFound.length}/${SECTION_PATTERNS.length} core sections detected` },
    { key: "impact",     label: "Impact & Metrics",    score: impactScore,     max: 10, detail: `${totalImpact} quantified results detected` },
    { key: "readability",label: "Readability",         score: readabilityScore,max: 10, detail: `${bulletLines.length} bullets, ${Math.round(verbRatio * 100)}% verb-led` },
  ];

  const ats_score = Math.min(100, breakdown.reduce((s, c) => s + c.score, 0));

  // ---------- Recruiter appeal (separate 0-100) ----------
  const recruiter =
    Math.round(verbRatio * 35) +              // strong verbs
    Math.round(impactPct * 30) +              // metrics
    Math.round(structPct * 15) +              // sections
    Math.round(lengthOk * 10) +               // bullet length sanity
    Math.round(Math.min(1, matched.length / 12) * 10); // role vocabulary
  const recruiter_score = Math.max(0, Math.min(100, recruiter));

  // ---------- Recommendations ----------
  const recs: { score: number; text: string }[] = [];
  if (keywordPct < 0.7) recs.push({ score: 35 - keywordScore, text: `Add missing JD keywords: ${missing.slice(0, 6).join(", ")}` });
  if (skillsEarned < 0.7) recs.push({ score: 20 - skillsScore, text: "Add a Skills section listing the exact tools/technologies named in the JD." });
  if (impactPct < 0.6)   recs.push({ score: 10 - impactScore, text: "Quantify more achievements — add %, $ amounts, time saved, users impacted." });
  if (verbRatio < 0.7)   recs.push({ score: 8, text: "Start every bullet with a strong action verb (Led, Built, Launched, Reduced, Drove)." });
  if (structPct < 1)     recs.push({ score: 10 - structureScore, text: `Add missing sections: ${SECTION_PATTERNS.filter(p => !p.re.test(resume)).map(p => p.name).join(", ")}.` });
  if (avgBulletWords > 30) recs.push({ score: 5, text: "Tighten long bullets — keep them under 25 words for scannability." });
  if (avgBulletWords > 0 && avgBulletWords < 6) recs.push({ score: 5, text: "Expand sparse bullets — include the action, the how, and the result." });
  if (expPct < 0.6)      recs.push({ score: 15 - experienceScore, text: "Lead with experience that mirrors the target role's responsibilities." });

  const recommendations = recs
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(r => r.text);

  if (recommendations.length === 0) {
    recommendations.push("Your resume is well-aligned. Continue refining wording for recruiter appeal and persuasive tone.");
  }

  return {
    ats_score,
    recruiter_score,
    breakdown,
    recommendations,
    matched_keywords: matched.slice(0, 30),
    missing_top_keywords: missing.slice(0, 15),
  };
}
