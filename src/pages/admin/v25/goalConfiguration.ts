import type {DataRow} from './model';
export function increaseGoalCount(goals: DataRow[], count: number, nextNumber = 1) {
  if (!Number.isInteger(count) || count < 1 || count > 20) throw new Error('Goal count must be a whole number from 1 to 20.');
  if (count < goals.length) throw new Error('To reduce the goal count, delete the goal instead.');
  let next = Math.max(nextNumber, 1 + Math.max(0, ...goals.map(goal => Number(String(goal['Goal ID'] ?? '').replace(/^G/, '')) || 0)));
  const result = [...goals];
  while (result.length < count) result.push({'Goal ID': `G${next++}`, 'Goal Name': '', 'Goal Description': '', 'Total Indicators': 0, 'Total Initiatives': 0});
  return {goals: result, nextGoalNumber: next};
}
export function validateGoalNames(goals: DataRow[]) {
  const names = new Set<string>();
  for (const goal of goals) {
    const name = String(goal['Goal Name'] ?? '').trim();
    if (!name) throw new Error(`Goal Name is required for ${goal['Goal ID']}.`);
    if (names.has(name.toLowerCase())) throw new Error('Goal names must be distinct.');
    names.add(name.toLowerCase());
  }
}
export function goalDependencies(goalId: string, indicators: DataRow[], initiatives: DataRow[], indicatorData: DataRow[], initiativeData: DataRow[]) {
  const indicatorGoals = new Map(indicators.map(row => [row['Indicator ID'], row['Goal ID']]));
  const initiativeGoals = new Map(initiatives.map(row => [row['Initiative ID'], row['Goal ID']]));
  const counts = {
    indicators: indicators.filter(row => row['Goal ID'] === goalId).length,
    initiatives: initiatives.filter(row => row['Goal ID'] === goalId).length,
    data: indicatorData.filter(row => (indicatorGoals.get(row['Indicator ID']) ?? row['Goal ID']) === goalId).length + initiativeData.filter(row => (initiativeGoals.get(row['Initiative ID']) ?? row['Goal ID']) === goalId).length,
  };
  return {...counts, total: counts.indicators + counts.initiatives + counts.data};
}
