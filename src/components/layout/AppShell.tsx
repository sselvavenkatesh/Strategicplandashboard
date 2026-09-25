import {Menu,X} from 'lucide-react';
import {FormEvent,useEffect,useState} from 'react';
import {Link,Outlet,useNavigate} from 'react-router-dom';
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

  async function loadAdmin(userId:string){
    const {data,error}=await supabase.from('admin_users').select('Name,Email,Role,"Is Active"').eq('Auth User ID',userId).eq('Role','Admin').eq('Is Active',true).maybeSingle();
    if(error||!data){setAdmin(null);return false}
    setAdmin({name:data.Name||data.Email,email:data.Email});
    return true;
  }

  useEffect(()=>{
    let active=true;
    supabase.auth.getSession().then(async({data})=>{
      if(active&&data.session) await loadAdmin(data.session.user.id);
    });
    const {data:listener}=supabase.auth.onAuthStateChange((_event,session)=>{
      if(!active)return;
      if(session) void loadAdmin(session.user.id); else setAdmin(null);
    });
    return()=>{active=false;listener.subscription.unsubscribe()}
  },[]);

  async function submitSignIn(e:FormEvent){
    e.preventDefault();setAuthBusy(true);setAuthMessage('');
    const {data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
    if(error||!data.user){
      setAuthMessage('Sign in failed. Please check your email and password.');
      setAuthBusy(false);
      setTimeout(()=>{setSignInOpen(false);setAuthMessage('');nav('/')},1400);
      return;
    }
    const ok=await loadAdmin(data.user.id);
    if(!ok){
      await supabase.auth.signOut();
      setAuthMessage('Sign in failed. This account is not an active administrator.');
      setAuthBusy(false);
      setTimeout(()=>{setSignInOpen(false);setAuthMessage('');nav('/')},1400);
      return;
    }
    setPassword('');setSignInOpen(false);setAuthBusy(false);nav('/');
  }

  async function signOut(){await supabase.auth.signOut();setAdmin(null);nav('/')}

  return <div className="app-shell">
    <header className="topbar">
      <Link to="/" className="brand">{p.data?.logo?<img src={p.data.logo} alt="District logo"/>:<span className="brandMark">D360</span>}<b>{p.data?.districtName||'District 360'}</b></Link>
      <div className="tools">
        {admin?<button className="signInBtn welcomeUserBtn" onClick={signOut} title="Sign out">Welcome {admin.name}</button>:<button className="signInBtn" onClick={()=>{setAuthMessage('');setSignInOpen(true)}}>Sign In</button>}
        <button className="menuBtn" onClick={()=>setOpen(true)} aria-label="Open navigation"><Menu size={20}/></button>
      </div>
    </header>
    <Outlet/>
    <footer id="globalFooter"><span>Powered By</span><b>K12<span>Matrix</span></b></footer>
    <div className={'scrim '+(open?'on':'')} onClick={()=>setOpen(false)}/>
    <aside className={'navPanel '+(open?'open':'')}>
      <div className="navTitle"><b>Explore the Dashboard</b><button onClick={()=>setOpen(false)}><X size={18}/></button></div>
      <div className="navUtilities"><button>?</button><span>Help</span><button>⚙</button><span>Filters</span></div>
      <nav><Link to="/" onClick={()=>setOpen(false)}>⌂ <span>Home</span></Link><Link to="/summary" onClick={()=>setOpen(false)}>▦ <span>Summary</span></Link><small>GOALS</small>{g.data?.map((x,i)=><Link to={'/goals/'+x.id} onClick={()=>setOpen(false)} key={x.id}><i>{['✦','◆','●','▲'][i%4]}</i><span>{x.name}</span></Link>)}</nav>
      <div className="navPowered"><span>Powered By</span><b>K12Matrix</b></div>
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