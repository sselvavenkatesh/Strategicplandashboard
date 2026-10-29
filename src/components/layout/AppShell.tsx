import {Menu,Moon,Sparkles,Sun,X} from 'lucide-react';
import {FormEvent,useEffect,useRef,useState} from 'react';
import {Link,Outlet,useLocation,useNavigate} from 'react-router-dom';
import {getGoals,getProfile} from '../../lib/dashboard';
import {useDashboard} from '../../hooks/useDashboard';
import {supabase} from '../../lib/supabase';
import {useTheme} from '../../app/ThemeProvider';
import {apiGet,apiPost,fastApiEnabled} from '../../lib/api';
import {getAdminSession,loginAdmin,logoutAdmin} from '../../pages/admin/v25/adminApi';
import {isAiEnabled} from '../../lib/ai';

const liveAdmin=import.meta.env.VITE_V25_UI_PREVIEW==='true'&&fastApiEnabled;
type AdminProfile={name:string;email:string};

export function AppShell(){
  const{theme,toggleTheme}=useTheme();
  const[open,setOpen]=useState(false);
  const[signInOpen,setSignInOpen]=useState(false);
  const[email,setEmail]=useState('');
  const[password,setPassword]=useState('');
  const[authMessage,setAuthMessage]=useState('');
  const[authBusy,setAuthBusy]=useState(false);
  const[signinMethod,setSigninMethod]=useState<'Userbased'|'Google'|'Microsoft'>('Userbased');
  const[admin,setAdmin]=useState<AdminProfile|null>(null);
  const p=useDashboard(getProfile),g=useDashboard(getGoals);
  const nav=useNavigate();
  const location=useLocation();
  const initialPath=useRef(location.pathname);
  const[pageLoading,setPageLoading]=useState(false);
  const[aiEnabled,setAiEnabled]=useState(false);

  useEffect(()=>{isAiEnabled().then(setAiEnabled).catch(()=>setAiEnabled(false))},[]);

  useEffect(()=>{
    const key='strategic_access_session';
    let sessionId=sessionStorage.getItem(key);
    if(!sessionId){sessionId=crypto.randomUUID();sessionStorage.setItem(key,sessionId)}
    if(liveAdmin)return;
    const saved=sessionStorage.getItem('district360_admin');
    let userName:string|undefined,userEmail:string|undefined;
    if(saved){try{const x=JSON.parse(saved);userName=x?.name;userEmail=x?.email}catch{ /* Keep defaults if stored profile or sign-in settings are unavailable. */ }}
    supabase.functions.invoke('log-dashboard-access',{body:{sessionId,userName,userEmail,userType:saved?'Admin':'Public',pagePath:initialPath.current}}).catch(()=>{});
  },[]);

  useEffect(()=>{
    setPageLoading(true);
    const timer=window.setTimeout(()=>setPageLoading(false),450);
    return()=>window.clearTimeout(timer);
  },[location.pathname]);

  useEffect(()=>{(async()=>{if(fastApiEnabled){try{const config=await apiGet<{signinMethod:'Userbased'|'Google'|'Microsoft'}>('/api/v1/admin/signin-config');setSigninMethod(config.signinMethod)}catch{ /* Keep defaults if stored profile or sign-in settings are unavailable. */ };return}const{data}=await supabase.from('District_Profile').select('"Admin Signin Method"').limit(1).maybeSingle();if(data?.['Admin Signin Method'])setSigninMethod(data['Admin Signin Method'])})()},[]);

  useEffect(()=>{
    if(liveAdmin){const log=(user:AdminProfile|null)=>apiPost('/api/v1/access-log',{sessionId:sessionStorage.getItem('strategic_access_session'),userName:user?.name,userEmail:user?.email,userType:user?'Admin':'Public',pagePath:initialPath.current}).catch(()=>{});getAdminSession().then(user=>{setAdmin(user);void log(user)}).catch(()=>{setAdmin(null);void log(null)});return}
    const saved=sessionStorage.getItem('district360_admin');
    if(saved){try{setAdmin(JSON.parse(saved))}catch{sessionStorage.removeItem('district360_admin')}}
    (async()=>{const{data:{session}}=await supabase.auth.getSession();const ssoEmail=session?.user?.email;if(!saved&&ssoEmail){const{data}=await supabase.rpc('validate_sso_admin',{p_email:ssoEmail});const row=Array.isArray(data)?data[0]:null;if(row){const profile={name:row.user_name||row.user_email,email:row.user_email};sessionStorage.setItem('district360_admin',JSON.stringify(profile));setAdmin(profile)}else{await supabase.auth.signOut();setAuthMessage('This SSO account is not authorized for Admin access.')}}})();
  },[]);

  async function submitSignIn(e:FormEvent){
    e.preventDefault();setAuthBusy(true);setAuthMessage('');
    if(liveAdmin){try{const profile=await loginAdmin(email.trim(),password);setAdmin(profile);setPassword('');setSignInOpen(false);nav('/admin')}catch(reason){setAuthMessage(reason instanceof Error?reason.message:'Sign in failed.')}finally{setAuthBusy(false)}return}
    const {data,error}=await supabase.rpc('validate_admin_login',{p_email:email.trim(),p_password:password});
    const row=Array.isArray(data)?data[0]:null;
    if(error||!row){
      sessionStorage.removeItem('district360_admin');setAdmin(null);
      setAuthMessage('Sign in failed. Please check your email and password.');
      setAuthBusy(false);
      setTimeout(()=>{setSignInOpen(false);setAuthMessage('');nav('/')},1400);
      return;
    }
    const profile={name:row.user_name||row.user_email,email:row.user_email};
    sessionStorage.setItem('district360_admin',JSON.stringify(profile));
    setAdmin(profile);setPassword('');setSignInOpen(false);setAuthBusy(false);nav('/');
  }

  async function submitSso(provider:'google'|'azure'){
    setAuthBusy(true);setAuthMessage('');
    if(liveAdmin){const base=new URL(import.meta.env.BASE_URL,window.location.origin);window.location.assign(new URL(`api/v1/auth/admin/oauth/${provider==='azure'?'microsoft':'google'}/start?return_to=${encodeURIComponent(new URL('admin',base).href)}`,base).href);return}
    const options=provider==='azure'?{redirectTo:new URL(import.meta.env.BASE_URL,window.location.origin).href,scopes:'email openid profile',queryParams:{prompt:'select_account'}}:{redirectTo:new URL(import.meta.env.BASE_URL,window.location.origin).href,queryParams:{prompt:'select_account'}};
    const{error}=await supabase.auth.signInWithOAuth({provider,options});
    if(error){setAuthMessage('SSO sign in could not be started. Please contact your administrator.');setAuthBusy(false)}
  }

  async function signOut(){if(liveAdmin){setAuthBusy(true);try{await logoutAdmin();setAdmin(null);setPassword('');setEmail('');nav('/')}catch(reason){setAuthMessage(reason instanceof Error?reason.message:'Sign out failed.')}finally{setAuthBusy(false)}return}sessionStorage.removeItem('district360_admin');setAdmin(null);supabase.auth.signOut();nav('/')}

  return <div className="app-shell">
    {pageLoading&&<div className="pageLoader" role="status" aria-live="polite" aria-label="Loading page"><img className="k12LoaderLogo" src={`${import.meta.env.BASE_URL}k12matrix-logo.svg`} alt="K12Matrix"/><div className="k12LoaderPulse"/><small>Loading strategic plan…</small></div>}
    <header className="topbar">
      <Link to="/" className="brand"><span className="districtLogo" aria-hidden="true">{p.data?.logo?<img src={p.data.logo} alt=""/>:<svg viewBox="0 0 48 48"><path d="M8 17c6 0 11 2 16 6 5-4 10-6 16-6v20c-6 0-11 2-16 5-5-3-10-5-16-5V17Z"/><path d="M24 23v19M13 13l3 3M35 13l-3 3M24 7v5M17 9l2 4M31 9l-2 4"/><path d="M17 17a8 8 0 0 1 14 0"/></svg>}</span><b>{p.data?.districtName||'District'}</b><span className="headerPowered"><span>Powered By</span><img src={`${import.meta.env.BASE_URL}k12matrix-logo.svg`} alt="K12Matrix"/></span></Link>
      <div className="tools">
        {admin?<><Link className="signInBtn" to="/admin">Admin workspace</Link><button disabled={authBusy} className="signInBtn welcomeUserBtn" onClick={signOut} title="Sign out">{authBusy?'Signing out…':`Welcome ${admin.name}`}</button></>:<button className="signInBtn" onClick={()=>{setAuthMessage('');setSignInOpen(true)}}>Sign In</button>}
        {aiEnabled&&<button className="aiHeaderBtn" onClick={()=>nav('/ai')} aria-label="Open K12 AI Assistant" title="K12 AI Assistant"><span className="aiMarkText">AI</span><Sparkles className="aiMarkSpark" size={10}/></button>}
        <button className="themeBtn" onClick={toggleTheme} aria-label={theme==='dark'?'Switch to light theme':'Switch to dark theme'} title={theme==='dark'?'Switch to light theme':'Switch to dark theme'}>{theme==='dark'?<Sun size={18}/>:<Moon size={18}/>}</button>
        <button className="menuBtn" onClick={()=>setOpen(true)} aria-label="Open navigation"><Menu size={20}/></button>
      </div>
    </header>
    {liveAdmin&&admin&&authMessage&&<div className="signInError" role="alert">{authMessage}</div>}
    <Outlet/>
    <div className={'scrim '+(open?'on':'')} onClick={()=>setOpen(false)}/>
    <aside className={'navPanel '+(open?'open':'')}>
      <div className="navTitle"><b>Explore the Dashboard</b><button onClick={()=>setOpen(false)}><X size={18}/></button></div>
      <nav><Link to="/" onClick={()=>setOpen(false)}>⌂ <span>Home</span></Link><Link to="/summary" onClick={()=>setOpen(false)}>▦ <span>Summary</span></Link><small>GOALS</small>{g.data?.map((x,i)=><Link to={'/goals/'+x.id} onClick={()=>setOpen(false)} key={x.id}><i>{['★','◆','♥','✦','●','▲','⬟','✚'][i%8]}</i><span>{x.name}</span></Link>)}</nav>
      <div className="navPowered"><span>Powered By</span><img src={`${import.meta.env.BASE_URL}k12matrix-logo.svg`} alt="K12Matrix"/></div>
    </aside>
    {signInOpen&&<div className="signInModal open" role="dialog" aria-modal="true" aria-labelledby="signInTitle" onMouseDown={e=>{if(e.target===e.currentTarget)setSignInOpen(false)}}>
      <form className="signInCard" onSubmit={submitSignIn}>
        <button type="button" className="signInClose" aria-label="Close sign in" onClick={()=>setSignInOpen(false)}>×</button>
        <img className="signInK12Logo" src={`${import.meta.env.BASE_URL}k12matrix-logo.svg`} alt="K12Matrix"/><small>ADMIN ACCESS</small><h2 id="signInTitle">Sign In</h2><p>Sign in with your administrator account.</p>
        {signinMethod==='Userbased'?<>
          <label htmlFor="adminEmail">Email</label><input id="adminEmail" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/>
          <label htmlFor="adminPassword">Password</label><input id="adminPassword" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/>
          {authMessage&&<div className="signInError" role="alert">{authMessage}</div>}
          <button className="signInSubmit" type="submit" disabled={authBusy}>{authBusy?'Signing in…':'Sign In'}</button>
        </>:<>
          {authMessage&&<div className="signInError" role="alert">{authMessage}</div>}
          <button className="signInSubmit ssoSignIn" type="button" disabled={authBusy} onClick={()=>submitSso(signinMethod==='Google'?'google':'azure')}>Sign in with {signinMethod}</button>
        </>}
      </form>
    </div>}
  </div>
}