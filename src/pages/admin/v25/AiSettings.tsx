import {useEffect,useState} from 'react';
import {Check,KeyRound,ShieldCheck} from 'lucide-react';
import {apiGet,apiPost} from '../../../lib/api';
type Settings={model:string;keySaved:boolean};
export function AiSettings(){
 const[settings,setSettings]=useState<Settings|null>(null),[model,setModel]=useState('gpt-oss:20b-cloud'),[key,setKey]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{let live=true;apiGet<Settings>('/api/v1/superadmin/ai-settings').then(value=>{if(live){setSettings(value);setModel(value.model)}}).catch(()=>{if(live)setError('AI configuration could not be loaded.')});return()=>{live=false}},[]);
 useEffect(()=>{if(!notice)return;const timer=window.setTimeout(()=>setNotice(''),5000);return()=>window.clearTimeout(timer)},[notice]);
 async function save(){if(busy)return;setBusy(true);setError('');try{const result=await apiPost<Settings>('/api/v1/superadmin/ai-settings',{model:model.trim(),apiKey:key.trim()||null});setSettings(result);setModel(result.model);setKey('');setNotice('Details are saved.')}catch(reason){setError(reason instanceof Error?reason.message:'AI settings could not be saved.')}finally{setBusy(false)}}
 return <section className="v25-panel"><div className="v25-panel-title"><h2><KeyRound size={18}/> District AI Configuration</h2><span className="v25-badge"><ShieldCheck size={13}/>{settings?.keySaved?'Key saved securely':'Setup required'}</span></div>
  <form onSubmit={event=>{event.preventDefault();void save()}}><div className="v25-form-grid"><label>Ollama Model<input required value={model} maxLength={150} onChange={event=>setModel(event.target.value)} disabled={busy}/></label><label>Ollama API Key<input type="password" autoComplete="new-password" required={!settings?.keySaved} value={key} maxLength={4000} onChange={event=>setKey(event.target.value)} placeholder={settings?.keySaved?'Leave blank to retain saved key':''} disabled={busy}/></label></div>
  <p className="v25-sso-help">The key is encrypted in Supabase Vault for this district. Saved keys are never shown again.</p>
  {error&&<p className="v25-inline-error" role="alert">{error}</p>}<div className="v25-panel-footer"><button type="submit" className="v25-button primary v25-save" disabled={busy||!settings}><Check size={14}/>{busy?'Saving…':'Save'}</button></div></form>
  {notice&&<div className="v25-toast" role="status">{notice}</div>}
 </section>;
}
