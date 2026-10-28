import {supabase} from '../../../lib/supabase';
import {apiGet, fastApiEnabled, fastApiV25Enabled} from '../../../lib/api';

export type DataRow = Record<string, string | number | null>;
export type Kind = 'goals' | 'indicators' | 'initiatives';
export type Assignments = Record<Kind, Record<string, string[]>>;
export type Dataset = {
  profile: DataRow; goals: DataRow[]; indicators: DataRow[]; initiatives: DataRow[];
  indicatorData: DataRow[]; initiativeData: DataRow[];
};
// Display-only snapshot of active Admin names. No emails, credentials or session data.
// Replace with an authenticated FastAPI stakeholder endpoint after UI approval.
export const stakeholders = [
  {id: '6', name: 'John Smith'}, {id: '7', name: 'Sarah Johnson'},
  {id: '8', name: 'Michael Brown'}, {id: '9', name: 'Emily Davis'},
  {id: '10', name: 'David Wilson'},
];
export const emptyAssignments = (): Assignments => ({goals: {}, indicators: {}, initiatives: {}});
export const idColumn = (kind: Kind) => kind === 'goals' ? 'Goal ID' : kind === 'indicators' ? 'Indicator ID' : 'Initiative ID';
export const text = (row: DataRow, key: string) => String(row[key] ?? '');

// A stakeholder's explicit assignments override inherited access for that resource type.
// If they have no explicit assignments, access follows their assigned goals.
export function accessibleRows(rows: DataRow[], kind: 'indicators' | 'initiatives', user: string, assignments: Assignments) {
  const explicit = Object.entries(assignments[kind]).filter(([, users]) => users.includes(user)).map(([id]) => id);
  const selected = new Set(explicit);
  return rows.filter(row => explicit.length > 0
    ? selected.has(text(row, idColumn(kind)))
    : (assignments.goals[text(row, 'Goal ID')] ?? []).includes(user));
}

async function readRows(table: string, columns: string, allRole = true): Promise<DataRow[]> {
  const rows: DataRow[] = [];
  for (let offset = 0; ; offset += 1000) {
    let request = supabase.from(table).select(columns).range(offset, offset + 999);
    if (allRole) request = request.eq('Role', 'All');
    const {data, error} = await request;
    if (error) throw new Error(`${table}: ${error.message}`);
    const page = (data ?? []) as unknown as DataRow[];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}

function withPreviewKeys(rows: DataRow[]): DataRow[] {
  const occurrences = new Map<string, number>();
  return rows.map(row => {
    const signature = JSON.stringify(row);
    const count = occurrences.get(signature) ?? 0;
    occurrences.set(signature, count + 1);
    return {...row, __previewKey: `${signature}#${count}`};
  });
}

async function signinFields(): Promise<DataRow> {
  if (!fastApiEnabled) return {};
  const config = await apiGet<{google?: {clientId?: string; authId?: string}; microsoft?: {clientId?: string; tenantId?: string; authId?: string}}>('/api/v1/admin/signin-config');
  return {'Google Client ID': config.google?.clientId ?? '', 'Google Auth ID': config.google?.authId ?? '', 'Microsoft Client ID': config.microsoft?.clientId ?? '', 'Microsoft Tenant ID': config.microsoft?.tenantId ?? '', 'Microsoft Auth ID': config.microsoft?.authId ?? ''};
}
export async function loadDataset(): Promise<Dataset> {
  if(fastApiV25Enabled){const [data,fields]=await Promise.all([apiGet<Dataset>('/api/v1/preview/dataset'),signinFields()]);return {...data,profile:{...data.profile,...fields},indicatorData:withPreviewKeys(data.indicatorData),initiativeData:withPreviewKeys(data.initiativeData)}}
  const [profiles, goals, indicators, initiatives, indicatorData, initiativeData, targets, fields] = await Promise.all([
    readRows('District_Profile', '"School District Name","Strategic Plan Name","Strategic Plan Duration","Mission Statement","Vision Statement","District Logo","Admin Signin Method"', false),
    readRows('Goal_master', '"Goal ID","Goal Name","Goal Description","Total Indicators","Total Initiatives"'),
    readRows('Indicator_master', '"Indicator ID","Indicator Name","Goal ID","Indicator Type","KPI Nature"'),
    readRows('Initiative_master', '"Initiative ID","Initiative Name","Goal ID","Total Sub Initiatives"'),
    readRows('Indicator_Data', '"Goal ID","Indicator ID","Indicator Name","School Year","Category","Student Group","Value 1","Value 2","Value 3","Target 1","Target 2","Target 3","School"'),
    readRows('Initiative_Data', '"Goal ID","Initiative ID","Initiative Name","Sub Initiative Name","Start Date","End Date","Action Item","Status","Target 1","Target 2","Target 3","School"'),
    readRows('Indicator_Target_Preview', 'indicator_id,school_year,target_1', false),
    signinFields(),
  ]);
  const sort = (rows: DataRow[], key: string) => rows.sort((a, b) => text(a, key).localeCompare(text(b, key), undefined, {numeric: true}));
  const targetMap = new Map(targets.map(row => [`${row.indicator_id}|${row.school_year}`, row.target_1]));
  return {
    profile: {...(profiles[0] ?? {}), ...fields}, goals: sort(goals, 'Goal ID'), indicators: sort(indicators, 'Indicator ID'), initiatives: sort(initiatives, 'Initiative ID'),
    indicatorData: withPreviewKeys(indicatorData.map(row => row.Category === 'All' && row['Student Group'] === 'All Students' && !row.School
      ? {...row, 'Target 1': targetMap.get(`${row['Indicator ID']}|${row['School Year']}`) ?? row['Target 1']} : row)),
    initiativeData: withPreviewKeys(initiativeData),
  };
}
