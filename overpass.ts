export function splitQuerySubpart(
  query: string
): { query: string; subpart: string | undefined; start: number }[] {
  const regexp = /\/\/\/\s*@subpart (?<subpart>[^\n]+)/dg;
  if (!query.match(regexp)) {
    return [{ query, subpart: undefined, start: 0 }];
  }
  query = query.trim();
  const subparts = Array.from(query.matchAll(regexp)).map(
    (match, index, array) => {
      const start = match.indices![0][0];
      return {
        query: query.slice(start, array[index + 1]?.indices?.[0]?.[0]),
        subpart: match.groups?.subpart,
        start,
      };
    }
  );
  if (subparts[0]?.start > 0) {
    const first = query.slice(0, subparts[0]?.start).trim();
    if (first) {
      subparts.unshift({ query: first, subpart: undefined, start: 0 });
    }
  }
  return subparts;
}
