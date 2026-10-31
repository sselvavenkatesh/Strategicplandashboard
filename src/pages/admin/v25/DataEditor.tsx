import {useState} from 'react';
import {ArrowDown, ArrowUp, ArrowUpDown, Check, Pencil, Search} from 'lucide-react';
import type {DataRow} from './model';
import {text} from './model';
import {compareDataValues} from './tableSort';

const statusOptions=[{value:'Not Yet Started',label:'Not Started'},{value:'In Progress',label:'In Progress'},{value:'Done',label:'Completed'}];
const selectedStatus=(status:string)=>status==='Not Started'?'Not Yet Started':statusOptions.some(option=>option.value===status)?status:'';
const statusLabel=(status:string)=>statusOptions.find(option=>option.value===status)?.label??status;

type Props = {kind: 'indicators' | 'initiatives'; rows: DataRow[]; initialResourceId?:string; startEditing?:boolean; editableIds?:string[]; onSave: (rows: DataRow[]) => void | Promise<void>};
export function DataEditor({kind, rows, initialResourceId='', startEditing=false, editableIds, onSave}: Props) {
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{column:string; direction:'asc'|'desc'} | null>(null);
  const [editing, setEditing] = useState(startEditing);
  const [resource,setResource]=useState(initialResourceId);
  const [changes, setChanges] = useState<Record<string, DataRow>>({});
  const [error, setError] = useState('');
  const [saving,setSaving]=useState(false);
  const pageSize = 15;
  const indicator = kind === 'indicators';
  const entity=indicator?'Indicator':'Initiative';
  const canEdit=(row:DataRow)=>!editableIds||editableIds.includes(text(row,`${entity} ID`));
  const resources=[...new Map(rows.map(row=>[text(row,`${entity} ID`),text(row,`${entity} Name`)])).entries()];
  const years = [...new Set(rows.map(row => text(row, 'School Year')).filter(Boolean))].sort().reverse();
  const categories = [...new Set(rows.map(row => text(row, 'Category')).filter(Boolean))].sort();
  const filtered = rows.map((row, index) => ({row, index})).filter(({row}) =>
    (!resource || text(row,`${entity} ID`)===resource) && (!year || row['School Year'] === year) && (!category || row.Category === category) &&
    Object.entries(row).filter(([key]) => key !== '__previewKey').map(([,value]) => value).join(' ').toLowerCase().includes(search.toLowerCase()));
  if(sort) filtered.sort((a,b) => compareDataValues(a.row[sort.column],b.row[sort.column],sort.column,sort.direction) || a.index-b.index);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const editable = new Set(indicator ? ['Value 1','Value 2','Value 3','Target 1','Target 2','Target 3'] : ['Start Date','End Date','Status','Action Item','Target 1','Target 2','Target 3']);
  const columns = indicator ? ['Goal Name','Indicator Name','School Year','Student Group','Value 1','Value 2','Value 3','Target 1','Target 2','Target 3'] : ['Goal Name','Initiative Name','Sub Initiative Name','Action Item','Start Date','End Date','Status','Target 1','Target 2','Target 3'];
  async function save() {
    if(saving)return;
    if (!indicator && Object.values(changes).some(row => !text(row, 'Action Item').trim())) {setError('Action item is required.'); return}
    setError('');
    setSaving(true);try{await onSave(Object.values(changes));setEditing(false);setChanges({});}catch(reason){setError(reason instanceof Error?reason.message:'Save failed.')}finally{setSaving(false)}
  }
  return <>
    <div className="v25-table-tools"><label className="v25-search"><Search size={14}/><input aria-label="Search reporting data" placeholder="Search reporting data…" value={search} onChange={event => {setSearch(event.target.value); setPage(1)}}/></label>
      {initialResourceId && <select aria-label={`Filter ${entity.toLowerCase()} data`} value={resource} onChange={event=>{setResource(event.target.value);setPage(1)}}><option value="">All {kind}</option>{resources.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select>}
      {indicator && <><select aria-label="School year" value={year} onChange={event => {setYear(event.target.value); setPage(1)}}><option value="">All school years</option>{years.map(value => <option key={value}>{value}</option>)}</select><select aria-label="Category" value={category} onChange={event => {setCategory(event.target.value); setPage(1)}}><option value="">All categories</option>{categories.map(value => <option key={value}>{value}</option>)}</select></>}
      <span>{filtered.length} records</span><div className="v25-inline-actions">{editing ? <><button className="v25-button" onClick={() => {setEditing(false); setChanges({}); setError('')}}>Cancel</button><button className="v25-button primary v25-save" disabled={saving} onClick={save}><Check size={13}/> Save</button></> : <button className="v25-button" disabled={!rows.some(canEdit)} onClick={() => {setChanges({}); setError(''); setEditing(true)}}><Pencil size={13}/> Edit</button>}</div>
    </div>
    {error && <p className="v25-inline-error" role="alert">{error}</p>}
    <div className="v25-table-scroll v25-dense-scroll"><table className={`v25-table v25-data-table v25-dense-data ${indicator ? 'indicator' : 'initiative'}`}><thead><tr>{columns.map(column => <th key={column} aria-sort={sort?.column === column ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}><button type="button" className="v25-sort" onClick={() => {setSort({column,direction:sort?.column===column && sort.direction==='asc'?'desc':'asc'});setPage(1)}}>{column.replace('Value','Actual')}{sort?.column===column ? sort.direction==='asc'?<ArrowUp size={11}/>:<ArrowDown size={11}/> : <ArrowUpDown size={11}/>}</button></th>)}</tr></thead>
      <tbody>{filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(({row: original, index}) => {
        const key = text(original,'__previewKey'); const row = changes[key] ?? original;
        return <tr key={key || index}>{columns.map(column => <td key={column} title={text(row,column)}>{editing && canEdit(row) && editable.has(column) ? column === 'Status' ? <select aria-label={`Status row ${index + 1}`} value={selectedStatus(text(row,column))} onChange={event => setChanges(previous => ({...previous,[key]:{...row,[column]:event.target.value}}))}><option value="" disabled hidden>{text(row,column) || 'Choose status'}</option>{statusOptions.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}</select> : <input aria-label={`${column.replace('Value','Actual')} row ${index + 1}`} value={text(row,column)} onChange={event => setChanges(previous => ({...previous,[key]:{...row,[column]:event.target.value || null}}))}/> : column === 'Status' ? <span className={`v25-status ${text(row,column) === 'Done' ? 'done' : ''}`}>{statusLabel(text(row,column)) || '—'}</span> : text(row,column) || '—'}</td>)}</tr>;
      })}</tbody>
    </table>{!filtered.length && <div className="v25-empty"><h3>No matching records</h3></div>}</div>
    <div className="v25-pagination"><span>{filtered.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}</span><div><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><span>{currentPage} / {pages}</span><button disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</button></div></div>
  </>;
}
