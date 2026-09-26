import {FormEvent,useEffect,useState} from 'react';
import {BarChart3,Building2,Download,FileSpreadsheet,Home,LogOut,Settings2,Upload} from 'lucide-react';
import {supabase} from '../../lib/supabase';

type Section='home'|'plan'|'indicators'|'initiatives';
type Profile={districtName:string;planName:string;duration:string;mission:string;vision:string;goals:number};

const menu=[
  {id:'home' as Section,label:'Home',icon:Home},
  {id:'plan' as Section,label:'Strategic Plan Configuration',icon:Settings2},
  {id:'indicators' as Section,label:'Indicator Configuration',icon:BarChart3},
  {id:'initiatives' as Section,label:'Initiative Configuration',icon:FileSpreadsheet},
];

export function SuperAdminPage(){
 const[authenticated,setAuthenticated]=useState(()=>sessionStorage.getItem('strategic_superadmin')==='true');
 const[email,setEmail]=useState('');const[password,setPassword]=useState('');const[error,setError]=useState('');const[busy,setBusy]=useState(false);
 const[section,setSection]=useState<Section>('home');
 const[profile,setProfile]=useState<Profile>({districtName:'',planName:'',duration:'',mission:'',vision:'',goals:0});
 const[indicators,setIndicators]=useState<any[]>([]);const[initiatives,setInitiatives]=useState<any[]>([]);

 useEffect(()=>{if(!authenticated)return;(async()=>{
  const[{data:p},{data:i},{data:n}]=await Promise.all([
   supabase.from('District_Profile').select('*').limit(1).maybeSingle(),
   supabase.from('Indicator_Data').select('*').limit(100),
   supabase.from('Initiative_Data').select('*').limit(100)
  ]);
  if(p)setProfile({districtName:p['School District Name']||'',planName:p['Strategic Plan Name']||'',duration:p['Strategic Plan Duration']||'',mission:p['Mission Statement']||'',vision:p['Vision Statement']||'',goals:Number(p['Total Goals']||0)});
  setIndicators(i||[]);setInitiatives(n||[]);
 })()},[authenticated]);

 async function login(e:FormEvent){e.preventDefault();setError('');
  if(email.trim().toLowerCase()!=='selva@k12matrix.com'){setError('This account is not authorized for Super Admin access.');return}
  setBusy(true);
  const{data,error:authError}=await supabase.rpc('validate_admin_login',{p_email:email.trim(),p_password:password});
  const row=Array.isArray(data)?data[0]:null;
  setBusy(false);
  if(authError||!row){setError('Sign in failed. Please check your email and password.');return}
  sessionStorage.setItem('strategic_superadmin','true');setAuthenticated(true);setPassword('');
 }
 function logout(){sessionStorage.removeItem('strategic_superadmin');setAuthenticated(false)}
 if(!authenticated)return <main className="superAdminLogin"><form className="superAdminLoginCard" onSubmit={login}>
  <img src="/k12matrix-logo.svg" alt="K12Matrix"/><small>SUPER ADMIN ACCESS</small><h1>Sign In</h1><p>Manage district strategic plan configuration and reporting data.</p>
  <label>Email</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Enter SuperAdmin email"/>
  <label>Password</label><input type="password" required value={password} onChange={e=>setPassword(e.target.value)}/>
  {error&&<div className="superAdminError">{error}</div>}<button disabled={busy}>{busy?'Signing in…':'Sign In'}</button>
 </form></main>;

 const data=section==='indicators'?indicators:initiatives;
 return <div className="superAdmin">
  <aside className="superAdminSide"><div className="superAdminBrand"><img src="/k12matrix-logo.svg" alt="K12Matrix"/><div><b>Strategic Plan</b><span>Super Admin</span></div></div>
   <nav>{menu.map(x=>{const Icon=x.icon;return <button key={x.id} className={section===x.id?'active':''} onClick={()=>setSection(x.id)}><Icon size={17}/><span>{x.label}</span></button>})}</nav>
   <button className="superAdminLogout" onClick={logout}><LogOut size={16}/> Sign Out</button>
  </aside>
  <main className="superAdminMain"><header><div><small>SUPER ADMIN</small><h1>{menu.find(x=>x.id===section)?.label}</h1></div><span className="superAdminUser">selva@k12matrix.com</span></header>
   {section==='home'&&<section><div className="adminWelcome"><Building2 size={26}/><div><h2>{profile.districtName||'District'}</h2><p>{profile.planName||'Strategic Plan'} · {profile.duration||'Duration not configured'}</p></div></div><div className="adminStats"><article><span>Goals</span><b>{profile.goals}</b></article><article><span>Indicator rows</span><b>{indicators.length}</b></article><article><span>Initiative rows</span><b>{initiatives.length}</b></article></div></section>}
   {section==='plan'&&<section className="adminPanel"><h2>District & Strategic Plan</h2><p>Configure the information displayed in the public Strategic Plan Dashboard.</p><div className="adminForm">
    <label>District Name<input value={profile.districtName} onChange={e=>setProfile({...profile,districtName:e.target.value})}/></label>
    <label>Strategic Plan Name<input value={profile.planName} onChange={e=>setProfile({...profile,planName:e.target.value})}/></label>
    <label>Strategic Plan Duration<input value={profile.duration} onChange={e=>setProfile({...profile,duration:e.target.value})}/></label>
    <label>Number of Goals<input type="number" min="1" max="20" value={profile.goals} onChange={e=>setProfile({...profile,goals:Number(e.target.value)})}/></label>
    <label className="wide">Mission Statement<textarea value={profile.mission} onChange={e=>setProfile({...profile,mission:e.target.value})}/></label>
    <label className="wide">Vision Statement<textarea value={profile.vision} onChange={e=>setProfile({...profile,vision:e.target.value})}/></label>
   </div><div className="adminNotice">Goal Name and Goal Description configuration will be connected to Goal_master in the data-write phase.</div><button className="adminPrimary" disabled>Save Configuration</button></section>}
   {(section==='indicators'||section==='initiatives')&&<section className="adminPanel"><div className="adminPanelHead"><div><h2>{section==='indicators'?'Indicator':'Initiative'} Data</h2><p>Review Supabase data and manage bulk updates using the approved CSV template.</p></div><div className="adminActions"><button><Download size={15}/> Download Template</button><label className="adminUpload"><Upload size={15}/> Upload CSV<input type="file" accept=".csv" disabled/></label></div></div>
    <div className="adminNotice">Upload is intentionally disabled in this first UI build. Validation and database-write controls will be added before uploads are enabled.</div>
    <div className="adminTableWrap"><table><thead><tr>{data[0]&&Object.keys(data[0]).slice(0,8).map(k=><th key={k}>{k}</th>)}</tr></thead><tbody>{data.slice(0,20).map((r,i)=><tr key={i}>{Object.keys(r).slice(0,8).map(k=><td key={k}>{String(r[k]??'')}</td>)}</tr>)}</tbody></table></div>
   </section>}
  </main>
 </div>
}