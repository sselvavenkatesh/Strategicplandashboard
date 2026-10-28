import {useEffect, useId, useRef} from 'react';
import {AlertTriangle, X} from 'lucide-react';
import {text} from './model';
import type {DataRow} from './model';
type Props = {goal: DataRow; dependencies: {indicators: number; initiatives: number; data: number; total: number}; lastGoal: boolean; onClose: () => void; onDelete: () => void};
export function DeleteGoalDialog({goal, dependencies, lastGoal, onClose, onDelete}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const blocked = dependencies.total > 0 || lastGoal;
  useEffect(() => {
    const modal = ref.current; const previous = document.activeElement as HTMLElement | null;
    modal?.showModal(); return () => {modal?.close(); previous?.focus()};
  }, []);
  return <dialog ref={ref} className="v25-dialog v25-delete-dialog" aria-labelledby={titleId} onCancel={onClose}>
    <form onSubmit={event => {event.preventDefault(); if (!blocked) onDelete()}}><div className="v25-dialog-head"><h2 id={titleId}><AlertTriangle size={18}/> {blocked ? 'Goal cannot be deleted' : 'Delete Goal?'}</h2><button type="button" className="v25-icon" aria-label="Close deletion warning" onClick={onClose}><X size={18}/></button></div>
      <p className="v25-delete-name">{text(goal, 'Goal Name') || text(goal, 'Goal ID')}</p>
      {dependencies.total > 0 ? <p className="v25-delete-message" role="alert">This goal has {dependencies.indicators} indicators, {dependencies.initiatives} initiatives and {dependencies.data} reporting records. Reassign or remove them before deleting the goal.</p> : lastGoal ? <p className="v25-delete-message" role="alert">At least one goal must remain.</p> : <p className="v25-delete-message">Delete this goal and its stakeholder assignments from the preview?</p>}
      <div className="v25-dialog-foot"><button type="button" className="v25-button" autoFocus onClick={onClose}>{blocked ? 'Close' : 'Cancel'}</button>{!blocked && <button type="submit" className="v25-button v25-danger">Delete Goal</button>}</div>
    </form>
  </dialog>;
}
