import {useEffect, useId, useRef, useState} from 'react';
import {Plus, Trash2, X} from 'lucide-react';
import {idColumn, text} from './model';
import type {DataRow} from './model';
import {buildInitiativeRows} from './initiativeDetails';
import type {SubInitiativeDraft} from './initiativeDetails';

type Props = {
  kind: 'indicators' | 'initiatives'; row: DataRow; isNew: boolean;
  goals: DataRow[]; records: DataRow[]; onClose: () => void; onSave: (row: DataRow, dataRows: DataRow[]) => void;
};
export function MasterEditor({kind, row, isNew, goals, records, onClose, onSave}: Props) {
  const [draft, setDraft] = useState(row);
  const [error, setError] = useState('');
  const [groups, setGroups] = useState<SubInitiativeDraft[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const indicator = kind === 'indicators';
  const nameKey = indicator ? 'Indicator Name' : 'Initiative Name';
  const entity = indicator ? 'Indicator' : 'Initiative';
  const types = [...new Set(['Percent', 'Number', 'Currency', ...records.map(record => text(record, 'Indicator Type'))].filter(Boolean))];
  useEffect(() => {
    const modal = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    modal?.showModal();
    return () => {modal?.close(); previous?.focus()};
  }, []);
  function save() {
    const name = text(draft, nameKey).trim();
    if (!name) {setError(`${entity} name is required.`); return}
    if (!goals.some(goal => goal['Goal ID'] === draft['Goal ID'])) {setError('Select a valid goal.'); return}
    if (records.some(record => record[idColumn(kind)] !== draft[idColumn(kind)] && record['Goal ID'] === draft['Goal ID'] && text(record, nameKey).trim().toLowerCase() === name.toLowerCase())) {setError(`This goal already has an ${entity.toLowerCase()} with that name.`); return}
    const master = {...draft, [nameKey]: name};
    try {
      const dataRows = indicator ? [] : buildInitiativeRows(master, groups);
      if (!indicator) master['Total Sub Initiatives'] = groups.length;
      onSave(master, dataRows);
    } catch (reason) {setError(reason instanceof Error ? reason.message : 'Check the sub-initiatives and action items.')}

  }
  return <dialog ref={dialog} className={`v25-dialog v25-master-dialog ${indicator ? '' : 'v25-initiative-dialog'}`} aria-labelledby={titleId} onCancel={onClose}>
    <form onSubmit={event => {event.preventDefault(); save()}}>
      <div className="v25-dialog-head"><h2 id={titleId}>{isNew ? 'Add' : 'Edit'} {entity}</h2><button type="button" className="v25-icon" aria-label="Close master editor" onClick={onClose}><X size={18}/></button></div>
      <div className="v25-form-grid">
        <label className="wide">{entity} Name<textarea autoFocus required maxLength={1000} value={text(draft, nameKey)} onChange={event => setDraft({...draft, [nameKey]: event.target.value})}/></label>
        <label>Goal<select required disabled={!isNew} value={text(draft, 'Goal ID')} onChange={event => setDraft({...draft, 'Goal ID': event.target.value})}><option value="">Select goal</option>{goals.map(goal => <option key={text(goal, 'Goal ID')} value={text(goal, 'Goal ID')}>{text(goal, 'Goal Name')}</option>)}</select></label>
        <label>{entity} ID<input readOnly value={text(draft, idColumn(kind))}/></label>
        {indicator && <><label>Indicator Type<select value={text(draft, 'Indicator Type')} onChange={event => setDraft({...draft, 'Indicator Type': event.target.value})}>{types.map(type => <option key={type}>{type}</option>)}</select></label><label>KPI Nature<select value={text(draft, 'KPI Nature')} onChange={event => setDraft({...draft, 'KPI Nature': event.target.value})}><option>Positive</option><option>Negative</option></select></label></>}
      </div>
      {!indicator && <div className="v25-sub-editor"><div className="v25-sub-header"><h3>Sub-initiatives</h3><button type="button" className="v25-button" onClick={() => setGroups(previous => [...previous, {id: crypto.randomUUID(), name: '', actions: [{id: crypto.randomUUID(), text: ''}]}])}><Plus size={13}/> Add Sub-Initiative</button></div>
        {groups.map((group, groupIndex) => <section className="v25-sub-card" key={group.id}><div className="v25-sub-name"><label>Sub-Initiative {groupIndex + 1}<input required aria-label={`Sub-Initiative ${groupIndex + 1}`} value={group.name} onChange={event => setGroups(previous => previous.map(item => item.id === group.id ? {...item, name: event.target.value} : item))}/></label><button type="button" className="v25-icon" aria-label={`Remove sub-initiative ${groupIndex + 1}`} onClick={() => setGroups(previous => previous.filter(item => item.id !== group.id))}><Trash2 size={14}/></button></div>
          <div className="v25-action-list">{group.actions.map((action, actionIndex) => <div className="v25-action-row" key={action.id}><label>Action Item {actionIndex + 1}<input required aria-label={`Sub-Initiative ${groupIndex + 1} Action Item ${actionIndex + 1}`} value={action.text} onChange={event => setGroups(previous => previous.map(item => item.id === group.id ? {...item, actions: item.actions.map(value => value.id === action.id ? {...value, text: event.target.value} : value)} : item))}/></label><button type="button" className="v25-icon" aria-label={`Remove action item ${actionIndex + 1} from sub-initiative ${groupIndex + 1}`} disabled={group.actions.length === 1} onClick={() => setGroups(previous => previous.map(item => item.id === group.id ? {...item, actions: item.actions.filter(value => value.id !== action.id)} : item))}><Trash2 size={13}/></button></div>)}</div>
          <button type="button" className="v25-button" onClick={() => setGroups(previous => previous.map(item => item.id === group.id ? {...item, actions: [...item.actions, {id: crypto.randomUUID(), text: ''}]} : item))}><Plus size={12}/> Add Action Item</button>
        </section>)}
      </div>}
      {error && <p role="alert" className="v25-inline-error">{error}</p>}
      <div className="v25-dialog-foot"><button type="button" className="v25-button" onClick={onClose}>Cancel</button><button type="submit" className="v25-button primary v25-save">Save</button></div>
    </form>
  </dialog>;
}
