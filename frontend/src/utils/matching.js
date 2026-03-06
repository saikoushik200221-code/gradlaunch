// ─── SEMANTIC MATCHING ENGINE (Pure JS TF-IDF) ───────────────────────────────

export function tokenize(text) {
    return text.toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .split(' ')
        .filter(t => t.length > 2);
}

export function buildTFVector(tokens, vocab) {
    const vec = {};
    tokens.forEach(t => {
        if (vocab.has(t)) vec[t] = (vec[t] || 0) + 1;
    });
    return vec;
}

export function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let mA = 0;
    let mB = 0;
    for (const k in vecA) {
        if (vecB[k]) dotProduct += vecA[k] * vecB[k];
        mA += vecA[k] * vecA[k];
    }
    for (const k in vecB) mB += vecB[k] * vecB[k];
    if (mA === 0 || mB === 0) return 0;
    return dotProduct / (Math.sqrt(mA) * Math.sqrt(mB));
}

export function computeSemanticScores(profileText, jobs) {
    if (!profileText) return jobs;
    const pTokens = tokenize(profileText);
    const vocab = new Set(pTokens);
    const pVec = buildTFVector(pTokens, vocab);

    return jobs.map(j => {
        const jText = `${j.title} ${j.company} ${j.description} ${j.skills?.join(" ")}`;
        const jVec = buildTFVector(tokenize(jText), vocab);
        const score = Math.round(cosineSimilarity(pVec, jVec) * 100);
        // Blend with original heuristic score (priority to semantic)
        const finalScore = Math.max(score, (j.match || 0) * 0.3);
        return { ...j, match: Math.min(99, Math.max(20, Math.round(finalScore))) };
    });
}
