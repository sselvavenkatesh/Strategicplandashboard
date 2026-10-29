import {useState} from 'react';
import {Check, Pencil, Plus, Search} from 'lucide-react';
import {idColumn, text} from './model';
import type {DataRow} from './model';
import {StakeholderSelect} from './StakeholderSelect';

type ResourceKind = 'indicators' | 'initiatives';
type Props = {kind: ResourceKind; records: DataRow[]; goals: DataRow[]; assignments: Record<string, string[]>; goalAssignments: Record<string, string[]>; superAdmin: boolean; accessMode: string; onAdd: (goalId: string) => void; onEditData?: (id:string) => void; onSave: (records: DataRow[], assignments: Record<string, string[]>) => void | Promise<void>};
export function MasterTable({kind, records, goals, assignments, goalAssignments, superAdmin, accessMode, onAdd, onEditData, onSave}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DataRow[]>([]);
  const [owners, setOwners] = useState<Record<string, string[]>>({});
  const [search, setSearch] = useState('');
  const [goalFilter, setGoalFilter] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [saving,setSaving]=useState(false);
  const indicator = kind === 'indicators';
  const entity = indicator ? 'Indicator' : 'Initiative';
  const nameKey = `${entity} Name`;
  const shortKey = indicator ? 'Indicator_short_name' : 'Initiative_Short_name';
  const rows = editing ? draft : records;
  const ownership = editing ? owners : assignments;
  const filtered = rows.filter(row => (!goalFilter || row['Goal ID'] === goalFilter) && Object.values(row).join(' ').toLowerCase().includes(search.toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 5));
  const currentPage = Math.min(page, pages);
  const types = [...new Set(['Percent','Number','Currency',...records.map(row => text(row,'Indicator Type'))].filter(Boolean))];
  const update = (id: string, field: string, value: string) => setDraft(previous => previous.map(row => text(row, idColumn(kind)) === id ? {...row, [field]: value} : row));
  function beginEdit() {setDraft(records.map(row => ({...row}))); setOwners(Object.fromEntries(Object.entries(assignments).map(([id, users]) => [id, [...users]]))); setEditing(true); setError(''); setSearch(''); setGoalFilter('')}
  async function save() {
    if(saving)return;
    const names = new Set<string>();
    for (const row of draft) {
      const name = text(row, nameKey).trim();
      if (!name) {setError(`${entity} name is required.`); return}
      if (!goals.some(goal => goal['Goal ID'] === row['Goal ID'])) {setError('Select a valid goal for every row.'); return}
      const key = JSON.stringify([row['Goal ID'], name.toLowerCase()]);
      const original=records.find(item=>item[idColumn(kind)]===row[idColumn(kind)]);
      if (names.has(key) && (!original || original['Goal ID']!==row['Goal ID'] || text(original,nameKey)!==text(row,nameKey))) {setError(`Duplicate ${entity.toLowerCase()} name in the same goal.`); return}
      names.add(key);
    }
    setSaving(true);try{await onSave(draft.map(row => ({...row, [nameKey]: text(row, nameKey).trim()})), owners);
    setEditing(false); setError('');}catch(reason){setError(reason instanceof Error?reason.message:'Save failed.')}finally{setSaving(false)}
  }
  const goalName = (id: string) => text(goals.find(goal => goal['Goal ID'] === id) ?? {}, 'Goal Name') || id;
  return <>
    <div className="v25-panel-title"><h2>{superAdmin ? `${entity} Master` : `Assigned ${indicator ? 'Indicators' : 'Initiatives'}`} <span className="v25-count">{records.length}</span></h2><div className="v25-inline-actions">{superAdmin ? editing ? <><button className="v25-button" onClick={() => {setEditing(false); setError('')}}>Cancel</button><button className="v25-button primary v25-save" disabled={saving} onClick={save}><Check size={13}/> Save</button></> : <><button className="v25-button" disabled={!records.length} onClick={beginEdit}><Pencil size={13}/> Edit</button><button className="v25-button primary" disabled={!goals.length} onClick={() => {onAdd(goalFilter); setSearch(''); setGoalFilter(''); setPage(Math.ceil((records.length + 1) / 5))}}><Plus size={14}/> Add {entity}</button></> : <span className="v25-badge">{accessMode}</span>}</div></div>
    {error && <p className="v25-inline-error" role="alert">{error}</p>}
    <div className="v25-table-tools"><label className="v25-search"><Search size={14}/><input aria-label="Search master" placeholder={`Search ${kind}…`} value={search} onChange={event => {setSearch(event.target.value); setPage(1)}}/></label><select aria-label="Filter by goal" value={goalFilter} onChange={event => {setGoalFilter(event.target.value); setPage(1)}}><option value="">All goals</option>{goals.map(goal => <option key={text(goal,'Goal ID')} value={text(goal,'Goal ID')}>{text(goal,'Goal Name')}</option>)}</select>{editing && <span className="v25-badge">Editing</span>}</div>
    <div className="v25-table-scroll v25-master-scroll"><table className="v25-table v25-master-table v25-master-expanded"><thead><tr><th>{entity}</th><th>Short name</th><th>Goal</th><th>{indicator ? 'Type / Direction' : 'Sub-initiatives'}</th><th>{superAdmin ? 'Stakeholder' : 'Edit data'}</th></tr></thead><tbody>{filtered.slice((currentPage - 1) * 5, currentPage * 5).map(row => {
      const id = text(row, idColumn(kind));
      return <tr key={id}><td>{editing ? <input aria-label={`${entity} Name ${id}`} maxLength={1000} value={text(row,nameKey)} onChange={event => update(id,nameKey,event.target.value)}/> : <b>{text(row,nameKey)}</b>}<small>{id}</small></td><td>{editing ? <input aria-label={`${entity} Short Name ${id}`} value={text(row,shortKey)} onChange={event => update(id,shortKey,event.target.value)}/> : text(row,shortKey) || '—'}</td><td>{editing ? <select aria-label={`Goal for ${id}`} value={text(row,'Goal ID')} onChange={event => {update(id,'Goal ID',event.target.value); setOwners(previous => ({...previous,[id]:[]}))}}>{goals.map(goal => <option key={text(goal,'Goal ID')} value={text(goal,'Goal ID')}>{text(goal,'Goal Name')}</option>)}</select> : goalName(text(row,'Goal ID'))}</td><td>{indicator ? editing ? <div className="v25-type-fields"><select aria-label={`Indicator Type ${id}`} value={text(row,'Indicator Type')} onChange={event => update(id,'Indicator Type',event.target.value)}>{types.map(type => <option key={type}>{type}</option>)}</select><select aria-label={`KPI Nature ${id}`} value={text(row,'KPI Nature')} onChange={event => update(id,'KPI Nature',event.target.value)}><option>Positive</option><option>Negative</option></select></div> : <>{text(row,'Indicator Type')}<small>{text(row,'KPI Nature')}</small></> : text(row,'Total Sub Initiatives')}</td><td>{superAdmin ? <StakeholderSelect disabled={!editing} allowedIds={goalAssignments[text(row,'Goal ID')] ?? []} inherit={{value:goalAssignments[text(row,'Goal ID')] ?? []}} label={`Stakeholder for ${text(row,nameKey)}`} value={ownership[id] ?? []} onChange={users => setOwners(previous => ({...previous,[id]:users}))}/> : <button type="button" className="v25-button" aria-label={`Edit ${entity.toLowerCase()} data for ${text(row,nameKey)}`} onClick={()=>onEditData?.(id)}><Pencil size={13}/> Edit</button>}</td></tr>;
    })}</tbody></table>{!filtered.length && <div className="v25-empty"><h3>No {kind} found</h3></div>}</div>
    <div className="v25-pagination"><span>{filtered.length ? (currentPage - 1) * 5 + 1 : 0}–{Math.min(currentPage * 5, filtered.length)} of {filtered.length}</span><div><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><span>{currentPage} / {pages}</span><button disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</button></div></div>
  </>;
}
