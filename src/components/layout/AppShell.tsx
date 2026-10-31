import {Menu,Moon,Sparkles,Sun,X,Home,LayoutDashboard,Target,Scale,HeartHandshake,UsersRound,ShieldCheck,LogOut,ChevronRight} from 'lucide-react';
import {FormEvent,useEffect,useRef,useState} from 'react';
import {Link,NavLink,Outlet,useLocation,useNavigate} from 'react-router-dom';
import {getGoals,getProfile} from '../../lib/dashboard';
import {useDashboard} from '../../hooks/useDashboard';
import {useTheme} from '../../app/ThemeProvider';
import {apiGet,apiPost} from '../../lib/api';
import {getAdminSession,loginAdmin,logoutAdmin} from '../../pages/admin/v25/adminApi';
import {isAiEnabled} from '../../lib/ai';
import {ProviderIcon} from '../SignInProviderIcon';
import './publicNavigation.css';
import './allenPark.css';

const liveAdmin=true;
type AdminProfile={name:string;email:string;role?:string};

export function AppShell(){
  const{theme,toggleTheme}=useTheme();
  const[open,setOpen]=useState(false);
  const[signInOpen,setSignInOpen]=useState(false);
  const[email,setEmail]=useState('');
  const[password,setPassword]=useState('');
  const[authMessage,setAuthMessage]=useState('');
  const[authBusy,setAuthBusy]=useState(false);
  const[signinMethod,setSigninMethod]=useState<'Userbased'|'Google'|'Microsoft'>('Userbased');
  const[providers,setProviders]=useState({google:false,microsoft:false});
  const[admin,setAdmin]=useState<AdminProfile|null>(null);
  const p=useDashboard(getProfile),g=useDashboard(getGoals);
  const isAllenPark=p.data?.districtId==='allen-park';
  useEffect(()=>{
    if(!isAllenPark)return;
    document.documentElement.dataset.publicDistrict='allen-park';
    return()=>{delete document.documentElement.dataset.publicDistrict;};
  },[isAllenPark]);
  const nav=useNavigate();
  const location=useLocation();
  const initialPath=useRef(location.pathname);
  const menuButton=useRef<HTMLButtonElement>(null);
  const navigation=useRef<HTMLElement>(null);
  const closeNavigation=useRef<HTMLButtonElement>(null);
  const initials=(admin?.name??'').split(/\s+/).filter(Boolean).slice(0,2).map(word=>word[0]).join('').toUpperCase();
  const role=admin?.role||'Admin';
  const goalIcons=[Target,Scale,HeartHandshake,UsersRound];
  useEffect(()=>{
    if(!open)return;
    const trigger=menuButton.current;
    closeNavigation.current?.focus();
    const keydown=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){setOpen(false);return}
      if(event.key==='Tab'){
        const controls=navigation.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])');
        if(!controls?.length)return;
        const first=controls[0],last=controls[controls.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
      }
    };
    document.addEventListener('keydown',keydown);
    return()=>{document.removeEventListener('keydown',keydown);trigger?.focus()};
  },[open]);
  const[pageLoading,setPageLoading]=useState(false);
  const[aiEnabled,setAiEnabled]=useState(false);

  useEffect(()=>{isAiEnabled().then(setAiEnabled).catch(()=>setAiEnabled(false))},[]);

  useEffect(()=>{
    try {
    const key='strategic_access_session';
    let sessionId=sessionStorage.getItem(key);
    if(!sessionId){sessionId=crypto.randomUUID();sessionStorage.setItem(key,sessionId)}
    } catch { /* Optional telemetry must not prevent the dashboard from rendering. */ }

  },[]);

  useEffect(()=>{
    setPageLoading(true);
    const timer=window.setTimeout(()=>setPageLoading(false),450);
    return()=>window.clearTimeout(timer);
  },[location.pathname]);

  useEffect(()=>{let live=true;apiGet<{signinMethod:'Userbased'|'Google'|'Microsoft';google:{configured:boolean};microsoft:{configured:boolean}}>('/api/v1/admin/signin-config').then(config=>{if(live){setSigninMethod(config.signinMethod);setProviders({google:config.google.configured,microsoft:config.microsoft.configured})}}).catch(()=>{});return()=>{live=false}},[signInOpen]);
  useEffect(()=>{
    const log=()=>{
      try {
        const sessionId=sessionStorage.getItem('strategic_access_session');
        if(sessionId)return apiPost('/api/v1/access-log',{sessionId,pagePath:initialPath.current}).catch(()=>{});
      } catch { /* Storage can be unavailable in privacy-restricted browsers. */ }
    };
    getAdminSession().then(user=>setAdmin(user)).catch(()=>setAdmin(null)).finally(log);
    // V2.4 browser profiles never establish V2.5 authorization.
    try {
      sessionStorage.removeItem('district360_admin');
      sessionStorage.removeItem('strategic_superadmin_token');
    } catch { /* Authorization uses server cookies, not these obsolete browser keys. */ }
  },[]);

  async function submitSignIn(e:FormEvent){
    e.preventDefault();setAuthBusy(true);setAuthMessage('');
    try{const profile=await loginAdmin(email.trim(),password);setAdmin(profile);setPassword('');setSignInOpen(false);nav('/admin')}catch(reason){setAuthMessage(reason instanceof Error?reason.message:'Sign in failed.')}finally{setAuthBusy(false)}
  }
  async function submitSso(provider:'google'|'azure'){
    setAuthBusy(true);setAuthMessage('');
    const base=new URL(import.meta.env.BASE_URL,window.location.origin);
    window.location.assign(new URL(`api/v1/auth/admin/oauth/${provider==='azure'?'microsoft':'google'}/start?return_to=${encodeURIComponent(new URL('admin',base).href)}`,base).href);
  }
  async function signOut(){setAuthBusy(true);try{await logoutAdmin();setAdmin(null);setPassword('');setEmail('');setOpen(false);nav('/')}catch(reason){setAuthMessage(reason instanceof Error?reason.message:'Sign out failed.')}finally{setAuthBusy(false)}}

  return <div className={'app-shell '+(isAllenPark?'allenParkPublic ':'')+(admin?'hasAccount':'')}>
    {pageLoading&&<div className="pageLoader" role="status" aria-live="polite" aria-label="Loading page"><img className="k12LoaderLogo" src={`${import.meta.env.BASE_URL}k12matrix-logo.svg`} alt="K12Matrix"/><div className="k12LoaderPulse"/><small>Loading strategic plan…</small></div>}
    <header className="topbar">
      <Link to="/" className={isAllenPark?'brand allenParkBrand':'brand'}>{isAllenPark?<span className="districtWordmark"><img src={p.data?.logo||`${import.meta.env.BASE_URL}districts/allen-park/allen-park-logo.png`} alt="Allen Park Public Schools"/></span>:<><span className="districtLogo" aria-hidden="true">{p.data?.logo?<img src={p.data.logo} alt=""/>:<svg viewBox="0 0 48 48"><path d="M8 17c6 0 11 2 16 6 5-4 10-6 16-6v20c-6 0-11 2-16 5-5-3-10-5-16-5V17Z"/><path d="M24 23v19M13 13l3 3M35 13l-3 3M24 7v5M17 9l2 4M31 9l-2 4"/><path d="M17 17a8 8 0 0 1 14 0"/></svg>}</span><b>{p.data?.districtName||'District'}</b></>}<span className="headerPowered"><span>Powered By</span><img src={`${import.meta.env.BASE_URL}k12matrix-logo.svg`} alt="K12Matrix"/></span></Link>
      <div className="tools">
        {admin?<><div className="headerAccount" aria-label={`Signed in as ${admin.name}, ${role}`}><span className="accountAvatar" aria-hidden="true">{initials}</span><span className="accountCopy"><b title={admin.name}>{admin.name}</b><small>{role}</small></span></div></>:<button className="signInBtn" onClick={()=>{setAuthMessage('');setSignInOpen(true)}}>Sign In</button>}
        {aiEnabled&&<button className="aiHeaderBtn" onClick={()=>nav('/ai')} aria-label="Open K12 AI Assistant" title="K12 AI Assistant"><span className="aiMarkText">AI</span><Sparkles className="aiMarkSpark" size={10}/></button>}
        <button className="themeBtn" onClick={toggleTheme} aria-label={theme==='dark'?'Switch to light theme':'Switch to dark theme'} title={theme==='dark'?'Switch to light theme':'Switch to dark theme'}>{theme==='dark'?<Sun size={18}/>:<Moon size={18}/>}</button>
        <button ref={menuButton} className="menuBtn" onClick={()=>setOpen(true)} aria-label="Open navigation" aria-expanded={open} aria-controls="dashboard-navigation"><Menu size={20}/></button>
      </div>
    </header>
    {liveAdmin&&admin&&authMessage&&<div className="signInError" role="alert">{authMessage}</div>}
    <Outlet/>
    <div className={'scrim '+(open?'on':'')} onClick={()=>setOpen(false)}/>
    <aside ref={navigation} id="dashboard-navigation" className={'navPanel dashboardNav '+(open?'open':'')} aria-label="Dashboard navigation" aria-hidden={!open} inert={!open}>
      <div className="navTitle"><div><span className="navEyebrow">STRATEGIC PLAN</span><b>Explore the dashboard</b></div><button ref={closeNavigation} aria-label="Close navigation" onClick={()=>setOpen(false)}><X size={17}/></button></div>
      <div className="navDistrict" title={p.data?.districtName}>{p.data?.districtName||'District dashboard'}</div>
      <nav aria-label="Dashboard pages">
        <small>OVERVIEW</small>
        <NavLink to="/" end onClick={()=>setOpen(false)}><span className="navItemIcon"><Home size={17}/></span><span>Home</span><ChevronRight size={13} className="navArrow"/></NavLink>
        <NavLink to="/summary" onClick={()=>setOpen(false)}><span className="navItemIcon"><LayoutDashboard size={17}/></span><span>Goal summary</span><ChevronRight size={13} className="navArrow"/></NavLink>
        <small>STRATEGIC GOALS</small>{g.data?.map((goal,index)=>{const Icon=goalIcons[index%goalIcons.length];return <NavLink to={'/goals/'+goal.id} onClick={()=>setOpen(false)} key={goal.id}><span className="navItemIcon"><Icon size={17}/></span><span className="navGoalLabel"><small>Goal {index+1}</small><b>{goal.name}</b></span><ChevronRight size={13} className="navArrow"/></NavLink>})}
        {admin&&<><small>ADMINISTRATION</small><NavLink to="/admin" onClick={()=>setOpen(false)}><span className="navItemIcon"><ShieldCheck size={17}/></span><span>Admin workspace</span><ChevronRight size={13} className="navArrow"/></NavLink></>}
      </nav>
      <div className="navAccountFooter">{admin&&<><div className="navAccount"><span className="accountAvatar" aria-hidden="true">{initials}</span><span className="accountCopy"><b title={admin.name}>{admin.name}</b><small>{role}</small></span></div><button className="navSignOut" disabled={authBusy} onClick={signOut}><LogOut size={16}/><span>{authBusy?'Signing out…':'Sign Out'}</span></button></>}
      <div className="navPowered"><span>Powered by</span><img src={`${import.meta.env.BASE_URL}${theme==='light'?'k12matrix-logo-light.svg':'k12matrix-logo.svg'}`} alt="K12Matrix"/></div></div>
    </aside>
    {signInOpen&&<div className="signInModal open" role="dialog" aria-modal="true" aria-labelledby="signInTitle" onMouseDown={e=>{if(e.target===e.currentTarget)setSignInOpen(false)}}>
      <form className="signInCard" onSubmit={submitSignIn}>
        <button type="button" className="signInClose" aria-label="Close sign in" onClick={()=>setSignInOpen(false)}>×</button>
        <img className="signInK12Logo" src={`${import.meta.env.BASE_URL}k12matrix-logo.svg`} alt="K12Matrix"/><small>ADMIN ACCESS</small><h2 id="signInTitle">Sign In</h2><p>Sign in with your administrator account.</p>
          <label htmlFor="adminEmail">Email</label><input id="adminEmail" type="email" autoComplete="username" disabled={authBusy} required value={email} onChange={e=>setEmail(e.target.value)}/>
          <label htmlFor="adminPassword">Password</label><input id="adminPassword" type="password" autoComplete="current-password" disabled={authBusy} required value={password} onChange={e=>setPassword(e.target.value)}/>
          {authMessage&&<div className="signInError" role="alert">{authMessage}</div>}
          <button className="signInSubmit" type="submit" disabled={authBusy}>{authBusy?'Signing in…':'Sign In'}</button>
        {signinMethod!=='Userbased'&&<><div className="signInDivider"><span>or</span></div><button className={'signInProvider '+(signinMethod==='Google'?'google':'microsoft')} type="button" disabled={authBusy||(liveAdmin&&!providers[signinMethod==='Google'?'google':'microsoft'])} onClick={()=>submitSso(signinMethod==='Google'?'google':'azure')}><ProviderIcon provider={signinMethod==='Google'?'google':'microsoft'}/>Sign in with {signinMethod}</button></>}
      </form>
    </div>}
  </div>
}
