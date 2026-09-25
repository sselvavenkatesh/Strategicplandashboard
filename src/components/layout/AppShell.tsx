import {Menu,X} from 'lucide-react';
import {FormEvent,useEffect,useState} from 'react';
import {Link,Outlet,useLocation,useNavigate} from 'react-router-dom';
import {getGoals,getProfile} from '../../lib/dashboard';
import {useDashboard} from '../../hooks/useDashboard';
import {supabase} from '../../lib/supabase';

type AdminProfile={name:string;email:string};

export function AppShell(){
  const[open,setOpen]=useState(false);
  const[signInOpen,setSignInOpen]=useState(false);
  const[email,setEmail]=useState('');
  const[password,setPassword]=useState('');
  const[authMessage,setAuthMessage]=useState('');
  const[authBusy,setAuthBusy]=useState(false);
  const[admin,setAdmin]=useState<AdminProfile|null>(null);
  const p=useDashboard(getProfile),g=useDashboard(getGoals);
  const nav=useNavigate();
  const location=useLocation();
  const[pageLoading,setPageLoading]=useState(false);

  useEffect(()=>{
    setPageLoading(true);
    const timer=window.setTimeout(()=>setPageLoading(false),450);
    return()=>window.clearTimeout(timer);
  },[location.pathname]);

  useEffect(()=>{
    const saved=sessionStorage.getItem('district360_admin');
    if(saved){try{setAdmin(JSON.parse(saved))}catch{sessionStorage.removeItem('district360_admin')}}
  },[]);

  async function submitSignIn(e:FormEvent){
    e.preventDefault();setAuthBusy(true);setAuthMessage('');
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

  function signOut(){sessionStorage.removeItem('district360_admin');setAdmin(null);nav('/')}

  return <div className="app-shell">
    {pageLoading&&<div className="pageLoader" role="status" aria-live="polite" aria-label="Loading page"><img className="k12LoaderLogo" src="/k12matrix-logo.svg" alt="K12Matrix"/><div className="k12LoaderPulse"/><small>Loading strategic plan…</small></div>}
    <header className="topbar">
      <Link to="/" className="brand"><span className="districtLogo" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M8 17c6 0 11 2 16 6 5-4 10-6 16-6v20c-6 0-11 2-16 5-5-3-10-5-16-5V17Z"/><path d="M24 23v19M13 13l3 3M35 13l-3 3M24 7v5M17 9l2 4M31 9l-2 4"/><path d="M17 17a8 8 0 0 1 14 0"/></svg></span><b>{p.data?.districtName||'District 360'}</b><span className="headerPowered"><span>Powered By</span><img src="/k12matrix-logo.svg" alt="K12Matrix"/></span></Link>
      <div className="tools">
        {admin?<button className="signInBtn welcomeUserBtn" onClick={signOut} title="Sign out">Welcome {admin.name}</button>:<button className="signInBtn" onClick={()=>{setAuthMessage('');setSignInOpen(true)}}>Sign In</button>}
        <button className="menuBtn" onClick={()=>setOpen(true)} aria-label="Open navigation"><Menu size={20}/></button>
      </div>
    </header>
    <Outlet/>
    <div className={'scrim '+(open?'on':'')} onClick={()=>setOpen(false)}/>
    <aside className={'navPanel '+(open?'open':'')}>
      <div className="navTitle"><b>Explore the Dashboard</b><button onClick={()=>setOpen(false)}><X size={18}/></button></div>
      <div className="navUtilities"><button>?</button><span>Help</span><button>⚙</button><span>Filters</span></div>
      <nav><Link to="/" onClick={()=>setOpen(false)}>⌂ <span>Home</span></Link><Link to="/summary" onClick={()=>setOpen(false)}>▦ <span>Summary</span></Link><small>GOALS</small>{g.data?.map((x,i)=><Link to={'/goals/'+x.id} onClick={()=>setOpen(false)} key={x.id}><i>{['✦','◆','●','▲'][i%4]}</i><span>{x.name}</span></Link>)}</nav>
      <div className="navPowered"><span>Powered By</span><img src="/k12matrix-logo.svg" alt="K12Matrix"/></div>
    </aside>
    {signInOpen&&<div className="signInModal open" role="dialog" aria-modal="true" aria-labelledby="signInTitle" onMouseDown={e=>{if(e.target===e.currentTarget)setSignInOpen(false)}}>
      <form className="signInCard" onSubmit={submitSignIn}>
        <button type="button" className="signInClose" aria-label="Close sign in" onClick={()=>setSignInOpen(false)}>×</button>
        <small>ADMIN ACCESS</small><h2 id="signInTitle">Sign In</h2><p>Sign in with your District 360 administrator account.</p>
        <label htmlFor="adminEmail">Email</label><input id="adminEmail" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/>
        <label htmlFor="adminPassword">Password</label><input id="adminPassword" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/>
        {authMessage&&<div className="signInError" role="alert">{authMessage}</div>}
        <button className="signInSubmit" type="submit" disabled={authBusy}>{authBusy?'Signing in…':'Sign In'}</button>
      </form>
    </div>}
  </div>
}