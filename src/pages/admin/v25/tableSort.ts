type Value = string | number | null | undefined;
const collator = new Intl.Collator(undefined, {numeric:true, sensitivity:'base'});
function comparable(value: Value, column: string): string | number | null {
  if (value == null || String(value).trim() === '') return null;
  const raw = String(value).trim();
  if (column.endsWith('Date')) {const timestamp=Date.parse(raw); if(Number.isFinite(timestamp)) return timestamp;}
  if (/^(Value|Target) [123]$/.test(column)) {
    const cleaned=raw.replace(/[, $%£€]/g,'');
    if (/^-?(?:\d+\.?\d*|\.\d+)$/.test(cleaned)) return Number(cleaned);
  }
  return raw;
}
export function compareDataValues(a: Value,b: Value,column: string,direction:'asc'|'desc'): number {
  const av=comparable(a,column), bv=comparable(b,column);
  if(av===null || bv===null) return av===bv ? 0 : av===null ? 1 : -1;
  const order=typeof av==='number' && typeof bv==='number' ? av-bv : collator.compare(String(av),String(bv));
  return direction==='asc' ? order : -order;
}
