import {createContext, useContext, useEffect, useId, useRef, useState} from 'react';
import {Check, ChevronDown, Search, Users} from 'lucide-react';
import {createPortal} from 'react-dom';
import type {Stakeholder} from './model';
export const StakeholderContext=createContext<Stakeholder[]>([]);

type Props = {disabled?: boolean; allowedIds?: string[]; inherit?: {value: string[]}; label: string; value: string[]; onChange: (value: string[]) => void};
export function StakeholderSelect({label, value, onChange, disabled = false, allowedIds, inherit}: Props) {
  const allStakeholders=useContext(StakeholderContext);
  const stakeholders=allowedIds ? allStakeholders.filter(user => allowedIds.includes(user.id)) : allStakeholders;
  const inherited=Boolean(inherit && !value.length);
  const selected=inherited ? inherit!.value : value;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState({top: 0, left: 0, width: 265});
  const menuRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {if (!ref.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node)) setOpen(false)};
    const close = () => setOpen(false);
    const scroll = (event: Event) => {if (!menuRef.current?.contains(event.target as Node)) close()};
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', close);
    document.addEventListener('scroll', scroll, true);
    return () => {document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', close); document.removeEventListener('scroll', scroll, true)};
  }, [open]);
  const names = stakeholders.filter(user => selected.includes(user.id)).map(user => user.name);
  return <div className="v25-multiselect" ref={ref} onKeyDown={event => {if (event.key === 'Escape') {setOpen(false); ref.current?.querySelector('button')?.focus()}}}>
    <button type="button" disabled={disabled} className={`v25-select-trigger ${selected.length ? 'has-value' : ''}`} aria-label={label} aria-expanded={open} aria-controls={id} onClick={event => {const rect = event.currentTarget.getBoundingClientRect(); const width = Math.min(265, window.innerWidth - 16); setPosition({width, left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)), top: window.innerHeight - rect.bottom >= 300 ? rect.bottom + 4 : Math.max(8, rect.top - 300)}); setOpen(!open); setSearch('')}}>
      <Users size={15}/><span>{names.length ? names.join(', ') : 'None'}{inherited && names.length > 0 && <small className="v25-inherited">Inherited</small>}</span><ChevronDown size={15}/>
    </button>
    {open && createPortal(<div ref={menuRef} style={position} className="v25-select-menu v25-select-floating" id={id} role="group" aria-label={label}>
      <div className="v25-select-search"><Search size={14}/><input autoFocus aria-label="Search stakeholders" placeholder="Search stakeholders" value={search} onChange={event => setSearch(event.target.value)}/></div>
      <label className="v25-select-option"><input type="checkbox" checked={value.length === 0} onChange={() => onChange([])}/><span>{inherit ? 'Inherit from Goal' : 'None'}</span>{!value.length && <Check size={14}/>}</label>
      {stakeholders.filter(user => user.name.toLowerCase().includes(search.toLowerCase())).map(user => <label className="v25-select-option" key={user.id}>
        <input type="checkbox" checked={selected.includes(user.id)} onChange={() => onChange(selected.includes(user.id) ? selected.filter(id => id !== user.id) : [...selected, user.id])}/><span>{user.name}</span>
      </label>)}
      {!stakeholders.some(user => user.name.toLowerCase().includes(search.toLowerCase())) && <p>No stakeholders found.</p>}
      <div className="v25-select-footer"><span>{selected.length} selected</span><button type="button" onClick={() => setOpen(false)}>Done</button></div>
    </div>, ref.current?.closest('.v25-root') ?? document.body)}
  </div>;
}
