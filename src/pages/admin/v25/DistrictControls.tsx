import {useEffect, useId, useRef, useState} from 'react';
import {Building2, Upload} from 'lucide-react';
export function GoalCountControl({count, onChange, onError}: {count: number; onChange: (count: number) => void; onError: (error: string) => void}) {
  const [value, setValue] = useState(String(count));
  const id = useId();
  useEffect(() => {setValue(String(count))}, [count]);
  function apply() {
    const next = Number(value);
    if (!Number.isInteger(next) || next < 1 || next > 20) {onError('Goal count must be a whole number from 1 to 20.'); setValue(String(count)); return}
    if (next < count) {onError('To reduce the goal count, delete the goal instead.'); setValue(String(count)); return}
    onChange(next);
  }
  return <div className="v25-goal-count-control"><label htmlFor={id}>Number of Goals</label><div><input id={id} type="number" min="1" max="20" step="1" value={value} onChange={event => setValue(event.target.value)} onKeyDown={event => {if (event.key === 'Enter') {event.preventDefault(); apply()}}}/><button type="button" className="v25-button" onClick={apply}>Apply</button></div></div>;
}
export function DistrictLogoControl({logo, readOnly, onChange}: {logo: string; readOnly: boolean; onChange: (logo: string) => void}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  function read(file: File) {
    setError('');
    if (!['image/png','image/jpeg','image/webp','image/svg+xml'].includes(file.type)) {setError('Select a PNG, JPEG, WebP or SVG image.'); return}
    if (file.size > 1024 * 1024) {setError('District logo must be 1 MB or smaller.'); return}
    const reader = new FileReader();
    reader.onload = () => {if (typeof reader.result === 'string') onChange(reader.result)};
    reader.onerror = () => setError('The logo could not be read.');
    reader.readAsDataURL(file);
  }
  return <div className="v25-logo-control"><span>District Logo</span><div>{logo ? <img src={logo} alt="District logo"/> : <Building2 size={26}/>} {!readOnly && <><button type="button" className="v25-button" onClick={() => input.current?.click()}><Upload size={13}/>{logo ? 'Change Logo' : 'Upload Logo'}</button><input ref={input} aria-label="Upload district logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={event => {const file = event.currentTarget.files?.[0]; if (file) read(file); event.currentTarget.value = ''}}/></>}</div>{error && <p role="alert" className="v25-inline-error">{error}</p>}</div>;
}
