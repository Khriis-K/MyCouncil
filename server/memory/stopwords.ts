export const STOPWORDS: ReadonlySet<string> = new Set(
  (
    'a about above after again against all also am an and any are as at be because been before being below between both but by ' +
    'can could did do does doing down during each few for from further had has have having he her here hers herself him himself his how ' +
    'i if in into is it its itself just me more most my myself no nor not now of off on once only or other our ours ourselves out over own ' +
    'same she should so some such than that the their theirs them themselves then there these they this those through to too under until up ' +
    'very was we were what when where which while who whom why will with would you your yours yourself yourselves ' +
    'dont doesnt didnt cant wont im ive id ill youre theyre weve thats theres lets get got going really still even much many ' +
    'one like yeah well okay'
  ).split(' '),
);

/** Lowercased distinct content words: letters/digits/apostrophes, stopwords and 1-char tokens removed. */
export function contentWords(text: string): Set<string> {
  const tokens: string[] = text.toLowerCase().replace(/['’]/g, '').match(/[a-z0-9]+/g) ?? [];
  return new Set(tokens.filter(t => t.length > 1 && !STOPWORDS.has(t)));
}
