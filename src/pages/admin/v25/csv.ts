import {idColumn, text} from './model';
import type {DataRow} from './model';
export type ResourceKind = 'indicators' | 'initiatives';
export const csvColumns = {
  indicators: ['Goal Name','Indicator Name','School Year','Category','Student Group','Value 1','Value 2','Value 3','Role','Target 1','Target 2','Target 3','School'],
  initiatives: ['Goal Name','Initiative Name','Sub Initiative Name','Start Date','End Date','Action Item','Status','Target 1','Target 2','Target 3','School','Role'],
};

export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false, closed = false;
  const finishCell = () => {row.push(cell); cell = ''; closed = false};
  const finishRow = () => {finishCell(); if (row.some(value => value.trim())) rows.push(row); row = []};
  const source = input.replace(/^\uFEFF/, '');
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {cell += '"'; i++} else {quoted = false; closed = true}
      } else cell += char;
    } else if (char === ',') finishCell();
    else if (char === '\r' || char === '\n') {if (char === '\r' && source[i + 1] === '\n') i++; finishRow()}
    else if (char === '"') {if (cell || closed) throw new Error('Invalid quote in CSV.'); quoted = true}
    else {if (closed && char.trim()) throw new Error('Unexpected text after a quoted CSV field.'); if (!closed) cell += char}
  }
  if (quoted) throw new Error('CSV has an unclosed quoted field.');
  finishRow();
  return rows;
}

// Match the current upload's reporting keys, using immutable IDs rather than
// mutable names so a master rename does not duplicate its reporting records.
export function reportingKey(kind: ResourceKind, row: DataRow): string {
  const keys = kind === 'indicators'
    ? ['Indicator ID', 'School Year', 'Category', 'Student Group']
    : ['Initiative ID', 'Sub Initiative Name', 'Action Item'];
  return JSON.stringify(keys.map(key => text(row, key).trim()));
}

// Compare complete names, never fuzzy-match a different master. Unicode spaces,
// repeated whitespace, letter case and equivalent Unicode forms are normalized.
export const normalizeName = (value: string) => value.normalize('NFKC').replace(/\s+/gu,' ').trim().toLowerCase();
export function validateCsv(input: string, kind: ResourceKind, masters: DataRow[], goals: DataRow[], allowedRoles:string[]=['All'], assignedOnly=false): DataRow[] {
  const parsed = parseCsv(input);
  const expected = csvColumns[kind];
  if (parsed.length < 2) throw new Error('CSV must contain headers and at least one data row.');
  const headers=parsed[0].map(value=>value.trim());
  // Old templates are accepted, but their IDs are never used to guess a name.
  const legacy = ['Goal ID',idColumn(kind),...(kind==='initiatives'?['Stakeholder ID']:[])];
  if(new Set(headers).size!==headers.length || expected.some(column=>!headers.includes(column)) || headers.some(column=>!expected.includes(column)&&!legacy.includes(column))) throw new Error('CSV columns do not match the template. Download the latest template and check the file again.');
  if (parsed.length > 5001) throw new Error('Upload is limited to 5,000 rows.');
  const seen = new Set<string>();
  const entity = kind === 'indicators' ? 'Indicator' : 'Initiative';
  const required = kind === 'indicators' ? ['Indicator Name','School Year','Category','Student Group'] : ['Initiative Name','Sub Initiative Name','Action Item'];
  return parsed.slice(1).map((values, index) => {
    const prefix = `Row ${index + 2}: `;
    if (values.length !== headers.length) throw new Error(`${prefix}expected ${headers.length} columns.`);
    const row: DataRow = Object.fromEntries(headers.map((key, i) => [key, values[i].trim() || null]));
    for (const key of required) if (!text(row, key)) throw new Error(`${prefix}${key} is required.`);
    const name=text(row,`${entity} Name`);
    const goalName=normalizeName(text(row,'Goal Name'));
    const candidates=masters.filter(record=>normalizeName(text(record,`${entity} Name`))===normalizeName(name)).filter(record=>!goalName || goals.some(goal=>goal['Goal ID']===record['Goal ID'] && normalizeName(text(goal,'Goal Name'))===goalName));
    if(!candidates.length && assignedOnly)throw new Error(`${prefix}${entity} "${name}" is not matching your assigned items. Please upload data which are assigned to you.`);
    if(!candidates.length) throw new Error(`${prefix}${entity} "${name}" is not available${goalName?' for this Goal':''}. Check the file and upload again.`);
    if(candidates.length>1) throw new Error(`${prefix}${entity} "${name}" matches more than one master. Check the Goal Name or ask Super Admin to give the masters distinct names, then upload again.`);
    const master=candidates[0];
    const goal=goals.find(record=>record['Goal ID']===master['Goal ID']);
    if(!goal)throw new Error(`${prefix}Goal for this ${entity.toLowerCase()} is not available. Check the file and upload again.`);
    if (!allowedRoles.includes(text(row,'Role')||'All')) throw new Error(`${prefix}this Role is not allowed.`);
    delete row['Stakeholder ID'];
    row.Role = row.Role || 'All';
    row[idColumn(kind)]=master[idColumn(kind)];
    row['Goal ID']=master['Goal ID'];
    row[`${entity} Name`] = master[`${entity} Name`];
    row['Goal Name'] = goal['Goal Name'];
    const key = reportingKey(kind, row);
    if (seen.has(key)) throw new Error(`${prefix}duplicate reporting key in the CSV.`);
    seen.add(key);
    return row;
  });
}

export function prepareUpload(kind: ResourceKind, uploaded: DataRow[], existing: DataRow[]) {
  const matches = new Map<string, DataRow[]>();
  for (const row of existing) {
    const key = reportingKey(kind, row);
    matches.set(key, [...(matches.get(key) ?? []), row]);
  }
  let updated = 0;
  const rows = uploaded.map(row => {
    const candidates = matches.get(reportingKey(kind, row)) ?? [];
    if (candidates.length > 1) throw new Error('A reporting key matches multiple records. Resolve the duplicate before uploading.');
    const previous = candidates[0];
    if (previous) updated++;
    return {...row, ...(previous && 'Stakeholder ID' in previous ? {'Stakeholder ID':previous['Stakeholder ID']} : {}), __previewKey: previous?.__previewKey ?? `csv:${kind}:${reportingKey(kind, row)}`};
  });
  return {rows, updated, added: rows.length - updated};
}
