import {useEffect, useId, useRef, useState} from 'react';
import {X} from 'lucide-react';
import {idColumn, text} from './model';
import type {DataRow} from './model';

type Props = {
  kind: 'indicators' | 'initiatives'; row: DataRow; isNew: boolean;
  goals: DataRow[]; records: DataRow[]; onClose: () => void; onSave: (row: DataRow) => void;
};
export function MasterEditor({kind, row, isNew, goals, records, onClose, onSave}: Props) {
  const [draft, setDraft] = useState(row);
  const [error, setError] = useState('');
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
    onSave({...draft, [nameKey]: name});
  }
  return <dialog ref={dialog} className="v25-dialog v25-master-dialog" aria-labelledby={titleId} onCancel={onClose}>
    <form onSubmit={event => {event.preventDefault(); save()}}>
      <div className="v25-dialog-head"><h2 id={titleId}>{isNew ? 'Add' : 'Edit'} {entity}</h2><button type="button" className="v25-icon" aria-label="Close master editor" onClick={onClose}><X size={18}/></button></div>
      <div className="v25-form-grid">
        <label className="wide">{entity} Name<textarea autoFocus required maxLength={1000} value={text(draft, nameKey)} onChange={event => setDraft({...draft, [nameKey]: event.target.value})}/></label>
        <label>Goal<select required disabled={!isNew} value={text(draft, 'Goal ID')} onChange={event => setDraft({...draft, 'Goal ID': event.target.value})}><option value="">Select goal</option>{goals.map(goal => <option key={text(goal, 'Goal ID')} value={text(goal, 'Goal ID')}>{text(goal, 'Goal Name')}</option>)}</select></label>
        <label>{entity} ID<input readOnly value={text(draft, idColumn(kind))}/></label>
        {indicator && <><label>Indicator Type<select value={text(draft, 'Indicator Type')} onChange={event => setDraft({...draft, 'Indicator Type': event.target.value})}>{types.map(type => <option key={type}>{type}</option>)}</select></label><label>KPI Nature<select value={text(draft, 'KPI Nature')} onChange={event => setDraft({...draft, 'KPI Nature': event.target.value})}><option>Positive</option><option>Negative</option></select></label></>}
      </div>
      {error && <p role="alert" className="v25-inline-error">{error}</p>}
      <div className="v25-dialog-foot"><button type="button" className="v25-button" onClick={onClose}>Cancel</button><button type="submit" className="v25-button primary v25-save">Save</button></div>
    </form>
  </dialog>;
}
