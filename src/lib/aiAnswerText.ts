export type IndicatorLabel = {id:string;name:string};

const normalise = (value:string) => value.normalize('NFKC').replace(/[‐‑‒–—−]/g,'-').replace(/\s+/g,' ').trim().toLowerCase();

// Presentation only: do not change the district data supplied to the AI.
export function formatIndicatorReferences(text:string, indicators:IndicatorLabel[]):string {
  const names = new Map(indicators.map(indicator => [indicator.id.toUpperCase(), indicator.name]));
  const withoutParentheticalCodes = text.replace(/([\p{L}\p{N}%])[ \t]*[([]\s*ID\d+\s*[)\]]/gu,'$1');
  return withoutParentheticalCodes.replace(/\bID\d+\b(?:[ \t]*[–—:-][ \t]*)?/gi,(reference:string,offset:number) => {
    const code = reference.match(/^ID\d+/i)![0].toUpperCase();
    const name = names.get(code);
    const following = withoutParentheticalCodes.slice(offset+reference.length);
    // Avoid repeating an existing label, including typographic hyphens.
    if(name && normalise(following).startsWith(normalise(name)))return '';
    if(name)return name+(/[–—:-]/.test(reference)?' – ':'');
    // An unknown code with an accompanying label can still show that label.
    return /[–—:-]/.test(reference)&&/^[\p{L}]/u.test(following)?'':'indicator';
  });
}
