function normalize(s) { return (s || "").toLowerCase().replace(/^v\./, "v"); }

function snapToList(candidate, list) {
  if (!candidate) return { value: null, matched: false };
  const c = normalize(candidate);
  const exact = list.find(x => normalize(x) === c);
  if (exact) return { value: exact, matched: true };
  const starts = list.find(x => normalize(x).startsWith(c));
  if (starts) return { value: starts, matched: true };
  return { value: candidate, matched: false };
}

function authorMatch(candidate, authors) {
  if (!candidate) return { value: null, matched: false };
  const c = candidate.toLowerCase().replace(/^@/, "");
  for (const a of authors || []) {
    const nm = (a.name || "").toLowerCase();
    const em = (a.email || "").toLowerCase();
    if (nm.includes(c) || em.includes(c)) {
      return { value: `${a.name}${a.email ? " <" + a.email + ">" : ""}`, matched: true };
    }
  }
  return { value: candidate, matched: false };
}

export function validateWithContext(docType, extracted, context) {
  const ctx = context || { tags: [], authors: [], features: [] };
  let { from_tag, to_tag, person, feature } = extracted || {};
  let bonus = 0;

  if (docType === "RN") {
    const f = snapToList(from_tag, ctx.tags);
    const t = snapToList(to_tag, ctx.tags);
    from_tag = f.value; to_tag = t.value;
    if (f.matched) bonus += 0.05;
    if (t.matched) bonus += 0.05;
  }
  if (docType === "PKT") {
    const m = authorMatch(person, ctx.authors);
    person = m.value;
    if (m.matched) bonus += 0.1;
  }
  if (docType === "FKT") {
    const m = snapToList(feature, ctx.features);
    feature = m.value;
    if (m.matched) bonus += 0.05;
  }

  return {
    extracted: { from_tag: from_tag || null, to_tag: to_tag || null, person: person || null, feature: feature || null },
    confidenceBonus: Math.min(bonus, 0.15)
  };
}
