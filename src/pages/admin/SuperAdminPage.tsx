import {FormEvent,useEffect,useState} from 'react';
import {BarChart3,Building2,Download,FileSpreadsheet,Home,LogOut,Settings2,Upload} from 'lucide-react';
import {supabase} from '../../lib/supabase';

type Section='home'|'plan'|'indicators'|'initiatives';
type SigninMethod='Userbased'|'Google'|'Microsoft';
type Profile={districtName:string;planName:string;duration:string;mission:string;vision:string;goals:number;logo:string;signinMethod:SigninMethod;googleClientId:string;googleAuthId:string;microsoftClientId:string;microsoftTenantId:string;microsoftAuthId:string};

const menu=[
  {id:'home' as Section,label:'Home',icon:Home},
  {id:'plan' as Section,label:'Strategic Plan Configuration',icon:Settings2},
  {id:'indicators' as Section,label:'Indicator Configuration',icon:BarChart3},
  {id:'initiatives' as Section,label:'Initiative Configuration',icon:FileSpreadsheet},
];

export function SuperAdminPage(){
 const[authenticated,setAuthenticated]=useState(()=>sessionStorage.getItem('strategic_superadmin')==='true');
 const[email,setEmail]=useState('');const[password,setPassword]=useState('');const[error,setError]=useState('');const[busy,setBusy]=useState(false);const[saveMessage,setSaveMessage]=useState('');
 const[section,setSection]=useState<Section>('home');
 const[profile,setProfile]=useState<Profile>({districtName:'',planName:'',duration:'',mission:'',vision:'',goals:0,logo:'',signinMethod:'Userbased',googleClientId:'',googleAuthId:'',microsoftClientId:'',microsoftTenantId:'',microsoftAuthId:''});
 const[initiativePage,setInitiativePage]=useState(1);const initiativePageSize=20;const[pendingDeleteGoals,setPendingDeleteGoals]=useState<any[]>([]);const[toast,setToast]=useState<{type:'success'|'error'|'warning',text:string}|null>(null);const[existingGoalCount,setExistingGoalCount]=useState(0);
 const[goals,setGoals]=useState<any[]>([]);const[indicators,setIndicators]=useState<any[]>([]);const[initiatives,setInitiatives]=useState<any[]>([]);const[indicatorCount,setIndicatorCount]=useState(0);const[initiativeCount,setInitiativeCount]=useState(0);

 useEffect(()=>{if(!authenticated)return;(async()=>{
  const[{data:p},{data:g},{data:i},{data:n},{count:ic},{count:nc}]=await Promise.all([
   supabase.from('District_Profile').select('*').limit(1).maybeSingle(),
   supabase.from('Goal_master').select('*').order('Goal ID'),
   supabase.from('Indicator_Data').select('*'),
   supabase.from('Initiative_Data').select('*'),
   supabase.from('Indicator_master').select('*',{count:'exact',head:true}).eq('Role','All'),
   supabase.from('Initiative_master').select('*',{count:'exact',head:true}).eq('Role','All')
  ]);
  if(p)setProfile({districtName:p['School District Name']||'',planName:p['Strategic Plan Name']||'',duration:p['Strategic Plan Duration']||'',mission:p['Mission Statement']||'',vision:p['Vision Statement']||'',goals:Number(p['Total Goals']||0),logo:p['District Logo']||'',signinMethod:(p['Admin Signin Method']||'Userbased') as SigninMethod,googleClientId:p['Google Client ID']||'',googleAuthId:p['Google Auth ID']||'',microsoftClientId:p['Microsoft Client ID']||'',microsoftTenantId:p['Microsoft Tenant ID']||'',microsoftAuthId:p['Microsoft Auth ID']||''});
  setGoals(g||[]);setExistingGoalCount((g||[]).length);setIndicators(i||[]);setInitiatives(n||[]);setIndicatorCount(ic||0);setInitiativeCount(nc||0);
 })()},[authenticated]);

 async function login(e:FormEvent){e.preventDefault();setError('');
  if(email.trim().toLowerCase()!=='selva@k12matrix.com'){setError('This account is not authorized for Super Admin access.');return}
  setBusy(true);
  const{data,error:authError}=await supabase.rpc('validate_superadmin_login',{p_email:email.trim(),p_password:password});
  const row=Array.isArray(data)?data[0]:null;
  setBusy(false);
  if(authError||!row){setError('Sign in failed. Please check your email and password.');return}
  sessionStorage.setItem('strategic_superadmin','true');sessionStorage.setItem('strategic_superadmin_token',row.session_token);setAuthenticated(true);setPassword('');
 }
 function logout(){sessionStorage.removeItem('strategic_superadmin');sessionStorage.removeItem('strategic_superadmin_token');setAuthenticated(false)}
 if(!authenticated)return <main className="superAdminLogin"><form className="superAdminLoginCard" onSubmit={login}>
  <img src="/k12matrix-logo.svg" alt="K12Matrix"/><small>SUPER ADMIN ACCESS</small><h1>Sign In</h1><p>Manage district strategic plan configuration and reporting data.</p>
  <label>Email</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Enter SuperAdmin email"/>
  <label>Password</label><input type="password" required value={password} onChange={e=>setPassword(e.target.value)}/>
  {error&&<div className="superAdminError">{error}</div>}<button disabled={busy}>{busy?'Signing in…':'Sign In'}</button>
 </form></main>;

 function notify(type:'success'|'error'|'warning',text:string){setToast({type,text});window.setTimeout(()=>setToast(null),4000)}
 function changeGoalCount(value:number){const count=Math.max(1,Math.min(20,value||1));if(count<existingGoalCount){notify('warning',`There are already ${existingGoalCount} Goals. The Goal count cannot be reduced here. Delete the Goal that is no longer required first.`);setProfile(p=>({...p,goals:Math.max(existingGoalCount,p.goals)}));return}setProfile({...profile,goals:count});setGoals(prev=>{const next=[...prev];while(next.length<count)next.push({'Goal ID':'','Goal Name':'','Goal Description':'','Role':'All'});return next.slice(0,count)})}
 function updateGoal(index:number,key:'Goal Name'|'Goal Description',value:string){setGoals(prev=>prev.map((g,i)=>i===index?{...g,[key]:value}:g))}
 function requestDeleteGoal(index:number){const goal=goals[index];if(!goal)return;if(!goal['Goal ID']){setGoals(prev=>prev.filter((_,i)=>i!==index));setProfile(p=>({...p,goals:Math.max(existingGoalCount,p.goals-1)}));notify('success','Unsaved Goal removed.');return}setPendingDeleteGoals([goal])}
 async function updateDistrictLogo(file:File){if(!file.type.startsWith('image/')){notify('error','Please select an image file.');return}if(file.size>1024*1024){notify('error','District logo must be 1 MB or smaller.');return}const reader=new FileReader();reader.onload=async()=>{const logo=String(reader.result||'');const token=sessionStorage.getItem('strategic_superadmin_token');if(!token)return;setBusy(true);const{error}=await supabase.rpc('update_superadmin_logo',{p_token:token,p_logo:logo});setBusy(false);if(error){notify('error',error.message);return}setProfile(p=>({...p,logo}));notify('success','District logo updated successfully.')};reader.readAsDataURL(file)}
 async function saveConfiguration(){const names=goals.slice(0,profile.goals).map(g=>String(g['Goal Name']||'').trim().toLowerCase());if(names.some(n=>!n)){notify('error','Goal Name is required for every goal.');return}if(new Set(names).size!==names.length){notify('error','Goal names must be distinct. A duplicate Goal Name is already present.');return}if(pendingDeleteGoals.length){notify('warning','Confirm or cancel the pending Goal deletion first.');return}const token=sessionStorage.getItem('strategic_superadmin_token');if(!token){notify('error','Your Super Admin session has expired. Please sign in again.');return}setBusy(true);setSaveMessage('');const payloadGoals=goals.slice(0,profile.goals).map(g=>({'Goal ID':g['Goal ID']||'', 'Goal Name':g['Goal Name']||'', 'Goal Description':g['Goal Description']||''}));const{error}=await supabase.rpc('save_superadmin_configuration',{p_token:token,p_profile:profile,p_goals:payloadGoals});setBusy(false);if(error)notify('error',error.message);else notify('success','Configuration saved successfully.')}
 
 async function confirmGoalDeletion(){const token=sessionStorage.getItem('strategic_superadmin_token');if(!token)return;setBusy(true);setSaveMessage('');for(const g of pendingDeleteGoals){const{error}=await supabase.rpc('delete_superadmin_goal',{p_token:token,p_goal_id:g['Goal ID']});if(error){setBusy(false);notify('error',error.message);return}}setPendingDeleteGoals([]);setGoals(prev=>prev.filter(g=>g['Goal ID']!==pendingDeleteGoals[0]?.['Goal ID']));setExistingGoalCount(v=>Math.max(0,v-1));setProfile(p=>({...p,goals:Math.max(1,p.goals-1)}));setBusy(false);notify('success','Goal deleted successfully.')}
 function cancelGoalDeletion(){setPendingDeleteGoals([])}
 
 const initiativePages=Math.max(1,Math.ceil(initiatives.length/initiativePageSize));
 const pagedInitiatives=initiatives.slice((initiativePage-1)*initiativePageSize,initiativePage*initiativePageSize);
 const data=section==='indicators'?indicators:pagedInitiatives;
 return <div className="superAdmin">{toast&&<div className={`adminToast ${toast.type}`}>{toast.text}</div>}{pendingDeleteGoals.length>0&&<div className="adminModalBackdrop"><div className="adminConfirmModal" role="dialog" aria-modal="true" aria-labelledby="delete-goal-title"><h3 id="delete-goal-title">Delete Goal?</h3><p>You are about to permanently delete <b>{pendingDeleteGoals[0]?.['Goal Name']}</b>. This action cannot be undone.</p><div className="modalActions"><button type="button" className="modalCancel" onClick={cancelGoalDeletion}>Cancel</button><button type="button" className="modalDelete" onClick={confirmGoalDeletion} disabled={busy}>{busy?'Deleting…':'Delete Goal'}</button></div></div></div>}
  <aside className="superAdminSide"><div className="superAdminBrand"><img src="/k12matrix-logo.svg" alt="K12Matrix"/><div><b>Strategic Plan</b><span>Super Admin</span></div></div>
   <nav>{menu.map(x=>{const Icon=x.icon;return <button key={x.id} className={section===x.id?'active':''} onClick={()=>setSection(x.id)}><Icon size={17}/><span>{x.label}</span></button>})}</nav>
   <button className="superAdminLogout" onClick={logout}><LogOut size={16}/> Sign Out</button>
  </aside>
  <main className="superAdminMain"><header><div><small>SUPER ADMIN</small><h1>{menu.find(x=>x.id===section)?.label}</h1></div><span className="superAdminUser">selva@k12matrix.com</span></header>
   {section==='home'&&<section><div className="adminWelcome"><Building2 size={26}/><div><h2>{profile.districtName||'District'}</h2><p>{profile.planName||'Strategic Plan'} · {profile.duration||'Duration not configured'}</p></div></div><div className="adminStats"><article><span>Goals</span><b>{profile.goals}</b></article><article><span>Indicators</span><b>{indicatorCount}</b></article><article><span>Initiatives</span><b>{initiativeCount}</b></article></div></section>}
   {section==='plan'&&<section className="adminPanel"><h2>District & Strategic Plan</h2><p>Configure the information displayed in the public Strategic Plan Dashboard.</p><div className="adminForm">
    <label>District Name<input value={profile.districtName} onChange={e=>setProfile({...profile,districtName:e.target.value})}/></label>
    <label className="logoField">District Logo<div className="districtLogoInline">{profile.logo&&<img src={profile.logo} alt="District logo preview"/>}<label className="logoUploadBtn">{profile.logo?'Change Logo':'Upload Logo'}<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={e=>{const file=e.target.files?.[0];if(file)updateDistrictLogo(file)}}/></label></div></label>
    <label>Strategic Plan Name<input value={profile.planName} onChange={e=>setProfile({...profile,planName:e.target.value})}/></label>
    <label>Strategic Plan Duration<input value={profile.duration} onChange={e=>setProfile({...profile,duration:e.target.value})}/></label>
    <label className="goalCountField">Number of Goals<input className="goalCountInput" type="number" min="1" max="20" value={profile.goals} onChange={e=>changeGoalCount(Number(e.target.value))}/></label>
    <label className="signinField">Admin Signin<select value={profile.signinMethod} onChange={e=>setProfile({...profile,signinMethod:e.target.value as SigninMethod})}><option value="Userbased">Userbased</option><option value="Google">Google</option><option value="Microsoft">Microsoft</option></select></label>
    <label className="wide">Mission Statement<textarea value={profile.mission} onChange={e=>setProfile({...profile,mission:e.target.value})}/></label>
    <label className="wide">Vision Statement<textarea value={profile.vision} onChange={e=>setProfile({...profile,vision:e.target.value})}/></label>
    {profile.signinMethod==='Google'&&<><label>Google Client ID<input value={profile.googleClientId} onChange={e=>setProfile({...profile,googleClientId:e.target.value})}/></label><label>Google Auth ID<input value={profile.googleAuthId} onChange={e=>setProfile({...profile,googleAuthId:e.target.value})}/></label></>}
    {profile.signinMethod==='Microsoft'&&<><label>Microsoft Client ID<input value={profile.microsoftClientId} onChange={e=>setProfile({...profile,microsoftClientId:e.target.value})}/></label><label>Microsoft Tenant ID<input value={profile.microsoftTenantId} onChange={e=>setProfile({...profile,microsoftTenantId:e.target.value})}/></label><label>Microsoft Auth ID<input value={profile.microsoftAuthId} onChange={e=>setProfile({...profile,microsoftAuthId:e.target.value})}/></label></>}
    <div className="adminNotice wide">OAuth client secrets are intentionally not stored in browser code or District_Profile. Configure provider secrets securely in Supabase Auth. These fields hold non-secret provider identifiers used by the Admin configuration.</div>
   </div><h3>Goal Master</h3><div className="goalEditor">{goals.slice(0,profile.goals).map((g,i)=><article key={g['Goal ID']||i}><div className="goalEditorHead"><b>Goal {i+1}</b><button type="button" className="goalDeleteBtn" onClick={()=>requestDeleteGoal(i)}>Delete</button></div><label>Goal Name<input value={g['Goal Name']||''} onChange={e=>updateGoal(i,'Goal Name',e.target.value)}/></label><label>Goal Description<textarea value={g['Goal Description']||''} onChange={e=>updateGoal(i,'Goal Description',e.target.value)}/></label></article>)}</div><div className="adminNotice">Goal IDs are managed automatically and are not shown here. Increasing the goal count adds another editable Goal section.</div><button className="adminPrimary" disabled={busy} onClick={saveConfiguration}>{busy?'Saving…':'Save Configuration'}</button></section>}
   {(section==='indicators'||section==='initiatives')&&<section className="adminPanel"><div className="adminPanelHead"><div><h2>{section==='indicators'?'Indicator':'Initiative'} Data</h2><p>Review Supabase data and manage bulk updates using the approved CSV template.</p></div><div className="adminActions"><button><Download size={15}/> Download Template</button><label className="adminUpload"><Upload size={15}/> Upload CSV<input type="file" accept=".csv" disabled/></label></div></div>
    <div className="adminNotice">Upload is intentionally disabled in this first UI build. Validation and database-write controls will be added before uploads are enabled.</div>
    <div className="adminTableWrap"><table><thead><tr>{data[0]&&Object.keys(data[0]).map(k=><th key={k}>{k}</th>)}</tr></thead><tbody>{data.map((r,i)=><tr key={i}>{Object.keys(r).map(k=><td key={k}>{String(r[k]??'')}</td>)}</tr>)}</tbody></table></div>
    {section==='initiatives'&&<div className="adminPagination"><span>Showing {(initiativePage-1)*initiativePageSize+1}–{Math.min(initiativePage*initiativePageSize,initiatives.length)} of {initiatives.length}</span><div><button disabled={initiativePage===1} onClick={()=>setInitiativePage(p=>Math.max(1,p-1))}>Previous</button><b>Page {initiativePage} of {initiativePages}</b><button disabled={initiativePage===initiativePages} onClick={()=>setInitiativePage(p=>Math.min(initiativePages,p+1))}>Next</button></div></div>}
   </section>}
  </main>
 </div>
}