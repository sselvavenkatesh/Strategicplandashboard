import {Menu,Moon,Sparkles,Sun,X} from 'lucide-react';
import {FormEvent,useEffect,useState} from 'react';
import {Link,Outlet,useLocation,useNavigate} from 'react-router-dom';
import {getGoals,getProfile} from '../../lib/dashboard';
import {useDashboard} from '../../hooks/useDashboard';
import {apiGet,apiPost,apiUrl} from '../../lib/api';
import {useTheme} from '../../app/ThemeProvider';
import {isAiEnabled} from '../../lib/ai';

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
  const[ssoConfigured,setSsoConfigured]=useState(true);
  const[admin,setAdmin]=useState<AdminProfile|null>(null);
  const p=useDashboard(getProfile),g=useDashboard(getGoals);
  const nav=useNavigate();
  const location=useLocation();
  const[pageLoading,setPageLoading]=useState(false);
  const[aiEnabled,setAiEnabled]=useState(false);

  useEffect(()=>{isAiEnabled().then(setAiEnabled).catch(()=>setAiEnabled(false))},[]);

  useEffect(()=>{
    const key='strategic_access_session';let sessionId=sessionStorage.getItem(key);if(!sessionId){sessionId=crypto.randomUUID();sessionStorage.setItem(key,sessionId)}
    const saved=sessionStorage.getItem('district360_admin');let userName:string|undefined,userEmail:string|undefined;if(saved){try{const x=JSON.parse(saved);userName=x?.name;userEmail=x?.email}catch{}}
    apiPost('/api/v1/access-log',{sessionId,userName,userEmail,userType:saved?'Admin':'Public',pagePath:location.pathname}).catch(()=>{});
  },[]);

  useEffect(()=>{apiGet<any>('/api/v1/admin/signin-config').then(x=>{const method=(x.signinMethod||'Userbased') as 'Userbased'|'Google'|'Microsoft';setSigninMethod(method);setSsoConfigured(method==='Google'?!!x.google?.configured:method==='Microsoft'?!!x.microsoft?.configured:true)}).catch(()=>{})},[]);

  useEffect(()=>{
    const q=new URLSearchParams(window.location.search);const token=q.get('adminSession');const authError=q.get('authError');
    if(token){const profile={name:q.get('name')||q.get('email')||'Admin',email:q.get('email')||''};sessionStorage.setItem('district360_admin',JSON.stringify(profile));sessionStorage.setItem('strategic_admin_token',token);setAdmin(profile);window.history.replaceState({},'',window.location.pathname)}
    else if(authError){setAuthMessage(authError==='not_authorized'?'This SSO account is not authorized for Admin access.':'SSO sign in failed. Please contact your administrator.');setSignInOpen(true);window.history.replaceState({},'',window.location.pathname)}
    else{const saved=sessionStorage.getItem('district360_admin');const sessionToken=sessionStorage.getItem('strategic_admin_token');if(saved&&sessionToken){apiGet<any>('/api/v1/auth/admin/session?token='+encodeURIComponent(sessionToken)).then(x=>setAdmin({name:x.name,email:x.email})).catch(()=>{sessionStorage.removeItem('district360_admin');sessionStorage.removeItem('strategic_admin_token');setAdmin(null)})}}
  },[]);

  useEffect(()=>{
    setPageLoading(true);
    const timer=window.setTimeout(()=>setPageLoading(false),450);
    return()=>window.clearTimeout(timer);
  },[location.pathname]);

  async function submitSignIn(e:FormEvent){e.preventDefault();setAuthBusy(true);setAuthMessage('');try{const row=await apiPost<any>('/api/v1/auth/admin/login',{email:email.trim(),password});const profile={name:row.name||row.email,email:row.email};sessionStorage.setItem('district360_admin',JSON.stringify(profile));sessionStorage.setItem('strategic_admin_token',row.token);setAdmin(profile);setPassword('');setSignInOpen(false);nav('/')}catch{sessionStorage.removeItem('district360_admin');sessionStorage.removeItem('strategic_admin_token');setAdmin(null);setAuthMessage('Sign in failed. Please check your email and password.')}finally{setAuthBusy(false)}}

  function submitSso(provider:'google'|'microsoft'){setAuthMessage('');if(!ssoConfigured){setAuthMessage(provider==='google'?'Google SSO is not fully configured by the district.':'Microsoft SSO is not fully configured by the district.');return}window.location.assign(apiUrl('/api/v1/auth/admin/oauth/'+provider+'/start?return_to='+encodeURIComponent(window.location.origin+window.location.pathname)))}

  function signOut(){const token=sessionStorage.getItem('strategic_admin_token');sessionStorage.removeItem('district360_admin');sessionStorage.removeItem('strategic_admin_token');setAdmin(null);if(token)apiPost('/api/v1/auth/admin/logout?token='+encodeURIComponent(token)).catch(()=>{});nav('/')}


  return <div className="app-shell">
    {pageLoading&&<div className="pageLoader" role="status" aria-live="polite" aria-label="Loading page"><img className="k12LoaderLogo" src="/k12matrix-logo.svg" alt="K12Matrix"/><div className="k12LoaderPulse"/><small>Loading strategic plan…</small></div>}
    <header className="topbar">
      <Link to="/" className="brand"><span className="districtLogo" aria-hidden="true">{p.data?.logo?<img src={p.data.logo} alt=""/>:<svg viewBox="0 0 48 48"><path d="M8 17c6 0 11 2 16 6 5-4 10-6 16-6v20c-6 0-11 2-16 5-5-3-10-5-16-5V17Z"/><path d="M24 23v19M13 13l3 3M35 13l-3 3M24 7v5M17 9l2 4M31 9l-2 4"/><path d="M17 17a8 8 0 0 1 14 0"/></svg>}</span><b>{p.data?.districtName||'District'}</b><span className="headerPowered"><span>Powered By</span><img src="/k12matrix-logo.svg" alt="K12Matrix"/></span></Link>
      <div className="tools">
        {admin?<button className="signInBtn welcomeUserBtn" onClick={signOut} title="Sign out">Welcome {admin.name}</button>:<button className="signInBtn" onClick={()=>{setAuthMessage('');setSignInOpen(true)}}>Sign In</button>}
        {aiEnabled&&<button className="aiHeaderBtn" onClick={()=>nav('/ai')} aria-label="Open K12 AI Assistant" title="K12 AI Assistant"><span className="aiMarkText">AI</span><Sparkles className="aiMarkSpark" size={10}/></button>}
        <button className="themeBtn" onClick={toggleTheme} aria-label={theme==='dark'?'Switch to light theme':'Switch to dark theme'} title={theme==='dark'?'Switch to light theme':'Switch to dark theme'}>{theme==='dark'?<Sun size={18}/>:<Moon size={18}/>}</button>
        <button className="menuBtn" onClick={()=>setOpen(true)} aria-label="Open navigation"><Menu size={20}/></button>
      </div>
    </header>
    <Outlet/>
    <div className={'scrim '+(open?'on':'')} onClick={()=>setOpen(false)}/>
    <aside className={'navPanel '+(open?'open':'')}>
      <div className="navTitle"><b>Explore the Dashboard</b><button onClick={()=>setOpen(false)}><X size={18}/></button></div>
      <nav><Link to="/" onClick={()=>setOpen(false)}>⌂ <span>Home</span></Link><Link to="/summary" onClick={()=>setOpen(false)}>▦ <span>Summary</span></Link><small>GOALS</small>{g.data?.map((x,i)=><Link to={'/goals/'+x.id} onClick={()=>setOpen(false)} key={x.id}><i>{['★','◆','♥','✦','●','▲','⬟','✚'][i%8]}</i><span>{x.name}</span></Link>)}</nav>
      <div className="navPowered"><span>Powered By</span><img src="/k12matrix-logo.svg" alt="K12Matrix"/></div>
    </aside>
    {signInOpen&&<div className="signInModal open" role="dialog" aria-modal="true" aria-labelledby="signInTitle" onMouseDown={e=>{if(e.target===e.currentTarget)setSignInOpen(false)}}>
      <form className="signInCard" onSubmit={submitSignIn}>
        <button type="button" className="signInClose" aria-label="Close sign in" onClick={()=>setSignInOpen(false)}>×</button>
        <img className="signInK12Logo" src="/k12matrix-logo.svg" alt="K12Matrix"/><small>ADMIN ACCESS</small><h2 id="signInTitle">Sign In</h2><p>Sign in with your administrator account.</p>
        {signinMethod==='Userbased'?<>
          <label htmlFor="adminEmail">Email</label><input id="adminEmail" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/>
          <label htmlFor="adminPassword">Password</label><input id="adminPassword" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/>
          {authMessage&&<div className="signInError" role="alert">{authMessage}</div>}
          <button className="signInSubmit" type="submit" disabled={authBusy}>{authBusy?'Signing in…':'Sign In'}</button>
        </>:<>
          {authMessage&&<div className="signInError" role="alert">{authMessage}</div>}
          <button className="signInSubmit ssoSignIn" type="button" disabled={authBusy} onClick={()=>submitSso(signinMethod==='Google'?'google':'microsoft')}>Sign in with {signinMethod}</button>
        </>}
      </form>
    </div>}
  </div>
}