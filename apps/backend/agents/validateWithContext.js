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
  let matches = 0;
  let possible = 0;

  if (docType === "RN") {
    possible += 2;
    const f = snapToList(from_tag, ctx.tags);
    const t = snapToList(to_tag, ctx.tags);
    from_tag = f.value; to_tag = t.value;
    if (f.matched) matches += 1;
    if (t.matched) matches += 1;
  }
  if (docType === "PKT") {
    possible += 1;
    const m = authorMatch(person, ctx.authors);
    person = m.value;
    if (m.matched) matches += 1;
  }
  // if (docType === "FKT") {
  //   possible += 1;
  //   const m = snapToList(feature, ctx.features);
  //   feature = m.value;
  //   if (m.matched) matches += 1;
  // }

  return {
    extracted: { from_tag: from_tag || null, to_tag: to_tag || null, person: person || null, feature: feature || null },
    contextConfidence: possible ? matches / possible : 0
  };
}
