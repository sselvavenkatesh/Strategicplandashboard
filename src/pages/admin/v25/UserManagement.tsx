import {useEffect,useState,type FormEvent} from 'react';
import {Pencil,Plus,RotateCcw,Check} from 'lucide-react';
import {apiGet,apiPost} from '../../../lib/api';

type User={id:string;name:string;email:string;googleEmail:string|null;microsoftEmail:string|null;active:boolean};
type Users={users:User[];revision:string};
type Draft=Omit<User,'id'> & {id?:string;password:string};
const empty=():Draft=>({name:'',email:'',googleEmail:'',microsoftEmail:'',active:true,password:''});
export function UserManagement({onChanged}:{onChanged:()=>void}){
 const[data,setData]=useState<Users|null>(null),[draft,setDraft]=useState<Draft|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function load(){setError('');try{setData(await apiGet<Users>('/api/v1/superadmin/users'))}catch(e){setError(e instanceof Error?e.message:'Users could not be loaded.')}}
 useEffect(()=>{let live=true;apiGet<Users>('/api/v1/superadmin/users').then(x=>{if(live)setData(x)}).catch(e=>{if(live)setError(e.message)});return()=>{live=false}},[]);
 async function save(user:Draft|User){if(!data||busy)return;setBusy(true);setError('');try{setData(await apiPost<Users>('/api/v1/superadmin/users',{revision:data.revision,user}));setDraft(null);onChanged()}catch(e){setError(e instanceof Error?e.message:'User could not be saved.')}finally{setBusy(false)}}
 function submit(e:FormEvent){e.preventDefault();if(draft)void save(draft)}
 return <section className="v25-panel"><div className="v25-panel-title"><h2>User Management <span className="v25-count">{data?.users.length??0}</span></h2><div className="v25-inline-actions"><button className="v25-button" disabled={busy} onClick={load}><RotateCcw size={13}/> Reload</button><button className="v25-button primary" disabled={busy||!data} onClick={()=>setDraft(empty())}><Plus size={13}/> Add User</button></div></div>
 {error&&<p className="v25-inline-error" role="alert">{error}</p>}
 {draft&&<form onSubmit={submit} className="v25-user-form"><h3>{draft.id?'Edit Admin':'Add Admin'}</h3><div className="v25-form-grid">
 <label>Name<input required maxLength={150} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
 <label>Email<input required type="email" maxLength={254} value={draft.email} onChange={e=>setDraft({...draft,email:e.target.value})}/></label>
 <label>Google Email<input type="email" maxLength={254} value={draft.googleEmail??''} onChange={e=>setDraft({...draft,googleEmail:e.target.value})}/></label>
 <label>Microsoft Email<input type="email" maxLength={254} value={draft.microsoftEmail??''} onChange={e=>setDraft({...draft,microsoftEmail:e.target.value})}/></label>
 <label>{draft.id?'New password (optional)':'Password (optional for SSO)'}<input type="password" autoComplete="new-password" minLength={12} maxLength={72} value={draft.password} onChange={e=>setDraft({...draft,password:e.target.value})}/></label>
 <label>Status<select value={draft.active?'active':'disabled'} onChange={e=>setDraft({...draft,active:e.target.value==='active'})}><option value="active">Active</option><option value="disabled">Disabled</option></select></label></div>
 <div className="v25-panel-footer"><button type="button" className="v25-button" disabled={busy} onClick={()=>setDraft(null)}>Cancel</button><button className="v25-button primary v25-save" disabled={busy}><Check size={13}/> Save</button></div></form>}
 {!data&&!error?<p role="status">Loading users…</p>:<div className="v25-table-scroll"><table className="v25-table"><thead><tr><th>Name</th><th>Email</th><th>Google Email</th><th>Microsoft Email</th><th>Status</th><th>Actions</th></tr></thead><tbody>{data?.users.map(user=><tr key={user.id}><td><b>{user.name}</b></td><td>{user.email}</td><td>{user.googleEmail||'—'}</td><td>{user.microsoftEmail||'—'}</td><td><span className="v25-badge">{user.active?'Active':'Disabled'}</span></td><td><div className="v25-inline-actions"><button className="v25-button" disabled={busy} onClick={()=>setDraft({...user,password:''})}><Pencil size={12}/> Edit</button><button className="v25-button" disabled={busy} onClick={()=>{if(window.confirm(`${user.active?'Disable':'Enable'} ${user.name}?${user.active?' Existing sessions will be signed out.':''}`))void save({...user,active:!user.active})}}>{user.active?'Disable':'Enable'}</button></div></td></tr>)}</tbody></table></div>}
 </section>;
}
