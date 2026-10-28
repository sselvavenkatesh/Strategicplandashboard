import type {DataRow} from './model';
export type ActionDraft = {id: string; text: string};
export type SubInitiativeDraft = {id: string; name: string; actions: ActionDraft[]};
export function buildInitiativeRows(master: DataRow, groups: SubInitiativeDraft[]): DataRow[] {
  const names = new Set<string>();
  return groups.flatMap(group => {
    const name = group.name.trim();
    if (!name) throw new Error('Sub-initiative name is required.');
    if (names.has(name.toLowerCase())) throw new Error('Sub-initiative names must be distinct.');
    names.add(name.toLowerCase());
    if (!group.actions.length) throw new Error('Add at least one action item to each sub-initiative.');
    const actions = new Set<string>();
    return group.actions.map(action => {
      const description = action.text.trim();
      if (!description) throw new Error('Action item is required.');
      if (actions.has(description.toLowerCase())) throw new Error('Action items must be distinct within a sub-initiative.');
      actions.add(description.toLowerCase());
      return {
        'Goal ID': master['Goal ID'], 'Initiative ID': master['Initiative ID'], 'Initiative Name': master['Initiative Name'],
        'Sub Initiative Name': name, 'Action Item': description, 'Start Date': null, 'End Date': null,
        Status: 'Not Started', 'Target 1': null, 'Target 2': null, 'Target 3': null, School: null,
        __previewKey: `initiative:${master['Initiative ID']}:${group.id}:${action.id}`,
      };
    });
  });
}
