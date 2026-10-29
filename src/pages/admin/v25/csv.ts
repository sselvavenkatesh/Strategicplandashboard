import {idColumn, text} from './model';
import type {DataRow} from './model';
export type ResourceKind = 'indicators' | 'initiatives';
export const csvColumns = {
  indicators: ['Goal ID','Goal Name','Indicator ID','Indicator Name','School Year','Category','Student Group','Value 1','Value 2','Value 3','Role','Target 1','Target 2','Target 3','School'],
  initiatives: ['Goal ID','Goal Name','Initiative ID','Initiative Name','Sub Initiative Name','Start Date','End Date','Action Item','Status','Target 1','Target 2','Target 3','School','Stakeholder ID','Role'],
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

export function validateCsv(input: string, kind: ResourceKind, masters: DataRow[], goals: DataRow[], allowedRoles:string[]=['All']): DataRow[] {
  const parsed = parseCsv(input);
  const expected = csvColumns[kind];
  if (parsed.length < 2) throw new Error('CSV must contain headers and at least one data row.');
  if (parsed[0].length !== expected.length || expected.some((column, index) => column !== parsed[0][index].trim())) throw new Error('CSV columns do not match the template.');
  if (parsed.length > 5001) throw new Error('Upload is limited to 5,000 rows.');
  const seen = new Set<string>();
  const entity = kind === 'indicators' ? 'Indicator' : 'Initiative';
  const required = kind === 'indicators' ? ['Goal ID','Indicator ID','Indicator Name','School Year','Category','Student Group'] : ['Goal ID','Initiative ID','Initiative Name','Sub Initiative Name','Action Item'];
  return parsed.slice(1).map((values, index) => {
    const prefix = `Row ${index + 2}: `;
    if (values.length !== expected.length) throw new Error(`${prefix}expected ${expected.length} columns.`);
    const row: DataRow = Object.fromEntries(expected.map((key, i) => [key, values[i].trim() || null]));
    for (const key of required) if (!text(row, key)) throw new Error(`${prefix}${key} is required.`);
    const master = masters.find(record => record[idColumn(kind)] === row[idColumn(kind)]);
    if (!master) throw new Error(`${prefix}unknown or unassigned ${entity.toLowerCase()} ID.`);
    const goal = goals.find(record => record['Goal ID'] === row['Goal ID']);
    if (!goal || master['Goal ID'] !== row['Goal ID']) throw new Error(`${prefix}goal does not match the ${entity.toLowerCase()}.`);
    if (!allowedRoles.includes(text(row,'Role')||'All')) throw new Error(`${prefix}this Role is not allowed.`);
    if (row['Stakeholder ID'] && !/^\d+$/.test(text(row, 'Stakeholder ID'))) throw new Error(`${prefix}Stakeholder ID must be numeric.`);
    row.Role = row.Role || 'All';
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
    return {...row, __previewKey: previous?.__previewKey ?? `csv:${kind}:${reportingKey(kind, row)}`};
  });
  return {rows, updated, added: rows.length - updated};
}
