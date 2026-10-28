import {useEffect, useRef, useState} from 'react';
import {Pencil, Search, X} from 'lucide-react';
import type {DataRow} from './model';
import {text} from './model';

type Props = {kind: 'indicators' | 'initiatives'; rows: DataRow[]; onSave: (index: number, row: DataRow) => void};
export function DataEditor({kind, rows, onSave}: Props) {
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const [editing, setEditing] = useState<{index: number; row: DataRow} | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const indicator = kind === 'indicators';
  const years = [...new Set(rows.map(row => text(row, 'School Year')).filter(Boolean))].sort().reverse();
  const categories = [...new Set(rows.map(row => text(row, 'Category')).filter(Boolean))].sort();
  const filtered = rows.map((row, index) => ({row, index})).filter(({row}) =>
    (!year || row['School Year'] === year) && (!category || row.Category === category) &&
    Object.values(row).join(' ').toLowerCase().includes(search.toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const fields = indicator ? ['Value 1', 'Value 2', 'Value 3', 'Target 1', 'Target 2', 'Target 3'] : ['Start Date', 'End Date', 'Status', 'Action Item', 'Target 1', 'Target 2', 'Target 3'];
  const columns = indicator ? ['Indicator Name', 'School Year', 'Student Group', 'Value 1', 'Value 2', 'Value 3', 'Target 1'] : ['Initiative Name', 'Sub Initiative Name', 'Start Date', 'End Date', 'Status'];
  const isEditing = editing !== null;
  useEffect(() => {
    if (!isEditing) return;
    const previous = document.activeElement as HTMLElement | null;
    const modal = dialog.current;
    modal?.showModal();
    return () => {modal?.close(); previous?.focus()};
  }, [isEditing]);
  return <>
    <div className="v25-table-tools"><label className="v25-search"><Search size={16}/><input aria-label="Search reporting data" placeholder="Search reporting data…" value={search} onChange={event => {setSearch(event.target.value); setPage(1)}}/></label>
      {indicator && <><select aria-label="School year" value={year} onChange={event => {setYear(event.target.value); setPage(1)}}><option value="">All school years</option>{years.map(value => <option key={value}>{value}</option>)}</select><select aria-label="Category" value={category} onChange={event => {setCategory(event.target.value); setPage(1)}}><option value="">All categories</option>{categories.map(value => <option key={value}>{value}</option>)}</select></>}
      <span>{filtered.length} records</span>
    </div>
    <div className="v25-table-scroll"><table className="v25-table v25-data-table"><thead><tr>{columns.map(column => <th key={column}>{column.replace('Value', 'Actual')}</th>)}<th>Action</th></tr></thead>
      <tbody>{filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(({row, index}) => <tr key={index}>{columns.map(column => <td key={column}>{column === 'Status' ? <span className={`v25-status ${text(row, column) === 'Done' ? 'done' : ''}`}>{text(row, column) || 'Not set'}</span> : text(row, column) || '—'}</td>)}<td><button className="v25-edit" onClick={() => setEditing({index, row: {...row}})} aria-label={`Edit ${text(row, indicator ? 'Indicator Name' : 'Sub Initiative Name')} ${text(row, indicator ? 'School Year' : 'Action Item')}`}><Pencil size={14}/> Edit</button></td></tr>)}</tbody>
    </table>{!filtered.length && <div className="v25-empty"><Search size={24}/><h3>No matching records</h3></div>}</div>
    <div className="v25-pagination"><span>{filtered.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}</span><div><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><span>Page {currentPage} of {pages}</span><button disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</button></div></div>
    {editing && <dialog ref={dialog} className="v25-dialog" onCancel={() => setEditing(null)} aria-labelledby="v25-edit-title">
      <form onSubmit={event => {event.preventDefault(); onSave(editing.index, editing.row); setEditing(null)}}>
        <div className="v25-dialog-head"><div><span className="v25-eyebrow">REPORTING DATA</span><h2 id="v25-edit-title">Edit {indicator ? 'indicator' : 'initiative'}</h2></div><button type="button" aria-label="Close editor" className="v25-icon" onClick={() => setEditing(null)}><X size={20}/></button></div>
        <div className="v25-record-context"><b>{text(editing.row, indicator ? 'Indicator Name' : 'Initiative Name')}</b><p>{indicator ? [text(editing.row, 'School Year'), text(editing.row, 'Category'), text(editing.row, 'Student Group')] .filter(Boolean).join(' · ') : text(editing.row, 'Sub Initiative Name')}</p></div>
        <div className="v25-form-grid">{fields.map(field => <label key={field} className={field === 'Action Item' ? 'wide' : ''}>{field.replace('Value', 'Actual')}{field === 'Status' ? <select value={text(editing.row, field)} onChange={event => setEditing({...editing, row: {...editing.row, [field]: event.target.value}})}><option value="">Not set</option>{[...new Set(['Not Started', 'In Progress', 'Done', 'On Hold', text(editing.row, field)].filter(Boolean))].map(status => <option key={status}>{status}</option>)}</select> : field === 'Action Item' ? <textarea value={text(editing.row, field)} onChange={event => setEditing({...editing, row: {...editing.row, [field]: event.target.value}})}/> : <input value={text(editing.row, field)} placeholder={field.includes('Date') ? 'e.g. Sep-2026' : 'Not set'} onChange={event => setEditing({...editing, row: {...editing.row, [field]: event.target.value || null}})}/>}</label>)}</div>
        <div className="v25-dialog-foot"><button type="button" className="v25-button" onClick={() => setEditing(null)}>Cancel</button><button type="submit" className="v25-button primary v25-save">Save</button></div>
      </form>
    </dialog>}
  </>;
}
