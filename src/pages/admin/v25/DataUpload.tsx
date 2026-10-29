import {useEffect, useId, useRef, useState} from 'react';
import {Download, Upload, X} from 'lucide-react';
import {csvColumns, prepareUpload, validateCsv} from './csv';
import type {ResourceKind} from './csv';
import type {DataRow} from './model';
import {text} from './model';

type Pending = {rows: DataRow[]; updated: number; added: number};
type Props = {kind: ResourceKind; masters: DataRow[]; goals: DataRow[]; rows: DataRow[]; allowedRoles?:string[]; assignedOnly?:boolean; onUpload: (rows: DataRow[]) => void | Promise<void>};
export function DataUpload({kind, masters, goals, rows, onUpload, allowedRoles, assignedOnly=false}: Props) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const reviewing = pending !== null;
  useEffect(() => {
    if (!reviewing) return;
    const modal = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    modal?.showModal();
    return () => {modal?.close(); previous?.focus()};
  }, [reviewing]);
  function downloadTemplate() {
    const blob = new Blob([csvColumns[kind].join(',') + '\r\n'], {type: 'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = kind === 'indicators' ? 'indicator_data_template.csv' : 'initiative_data_template.csv';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function selectFile(file: File) {
    setError(''); setBusy(true);
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('CSV file must be 2 MB or smaller.');
      const validated = validateCsv(await file.text(), kind, masters, goals, allowedRoles, assignedOnly);
      setPending(prepareUpload(kind, validated, rows));
    } catch (reason) {setError(reason instanceof Error ? reason.message : 'CSV could not be processed.')}
    finally {setBusy(false)}
  }
  const nameKey = kind === 'indicators' ? 'Indicator Name' : 'Initiative Name';
  return <div className="v25-upload-controls">
    <div className="v25-upload-buttons"><button type="button" className="v25-button" onClick={downloadTemplate}><Download size={14}/> Download Template</button><button type="button" className="v25-button primary" disabled={busy || masters.length === 0} onClick={() => input.current?.click()}><Upload size={14}/> {busy ? 'Reading…' : 'Upload Data'}</button><input ref={input} type="file" accept=".csv,text/csv" aria-label="Upload data CSV" hidden onChange={event => {const file = event.currentTarget.files?.[0]; if (file) void selectFile(file); event.currentTarget.value = ''}}/></div>
    {error && <p role="alert" className="v25-inline-error">{error}</p>}
    {pending && <dialog ref={dialog} className="v25-dialog" aria-labelledby={titleId} onCancel={() => setPending(null)}><form onSubmit={async event => {event.preventDefault();setBusy(true);try{await onUpload(pending.rows);setPending(null)}catch(reason){setError(reason instanceof Error?reason.message:'Upload failed.')}finally{setBusy(false)}}}>
      <div className="v25-dialog-head"><h2 id={titleId}>Review upload</h2><button type="button" className="v25-icon" aria-label="Close upload review" onClick={() => setPending(null)}><X size={18}/></button></div>
      <div className="v25-upload-summary"><span>{pending.rows.length} records</span><span>{pending.added} new</span><span>{pending.updated} updates</span></div>
      <div className="v25-table-scroll"><table className="v25-table"><thead><tr><th>{kind === 'indicators' ? 'Indicator' : 'Initiative'}</th><th>{kind === 'indicators' ? 'School Year' : 'Sub Initiative'}</th></tr></thead><tbody>{pending.rows.slice(0, 5).map((row, index) => <tr key={index}><td>{text(row, nameKey)}</td><td>{text(row, kind === 'indicators' ? 'School Year' : 'Sub Initiative Name')}</td></tr>)}</tbody></table></div>
      {error&&<p role="alert" className="v25-inline-error">{error}</p>}<div className="v25-dialog-foot"><button type="button" className="v25-button" onClick={() => setPending(null)}>Cancel</button><button type="submit" disabled={busy} className="v25-button primary v25-save">Upload</button></div>
    </form></dialog>}
  </div>;
}
