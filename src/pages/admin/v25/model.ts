export type DataRow = Record<string, string | number | null>;
export type Kind = 'goals' | 'indicators' | 'initiatives';
export type Assignments = Record<Kind, Record<string, string[]>>;
export type Dataset = {
  stakeholders?:Stakeholder[]; revision?:string; profile: DataRow; goals: DataRow[]; indicators: DataRow[]; initiatives: DataRow[];
  indicatorData: DataRow[]; initiativeData: DataRow[];
};
export type Stakeholder={id:string;name:string};
export const emptyAssignments = (): Assignments => ({goals: {}, indicators: {}, initiatives: {}});
export const idColumn = (kind: Kind) => kind === 'goals' ? 'Goal ID' : kind === 'indicators' ? 'Indicator ID' : 'Initiative ID';
export const text = (row: DataRow, key: string) => String(row[key] ?? '');

export function assignedGoalRows(rows: DataRow[], user: string, assignments: Assignments) {
  return rows.filter(row => Boolean(user) && (assignments.goals[text(row, 'Goal ID')] ?? []).includes(user));
}

// Empty resource selections inherit dynamically; nonempty selections restrict that row.
export function resourceStakeholders(row: DataRow, kind: 'indicators' | 'initiatives', assignments: Assignments): string[] {
  const goal = assignments.goals[text(row, 'Goal ID')] ?? [];
  const selected = assignments[kind][text(row, idColumn(kind))] ?? [];
  return selected.length ? selected.filter(id => goal.includes(id)) : goal;
}
export function accessibleRows(rows: DataRow[], kind: 'indicators' | 'initiatives', user: string, assignments: Assignments) {
  return rows.filter(row => resourceStakeholders(row, kind, assignments).includes(user));
}
