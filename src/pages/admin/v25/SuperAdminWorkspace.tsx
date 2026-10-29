import {useEffect,useState,type FormEvent} from 'react';
import {Link} from 'react-router-dom';
import V25AdminPage from './V25AdminPage';
import {getSuperAdminSession,loginSuperAdmin,logoutSuperAdmin,type SuperAdminUser} from './superadminApi';
import './v25.css';
export default function SuperAdminWorkspace(){
  const[user,setUser]=useState<SuperAdminUser|null>(null),[checking,setChecking]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const[email,setEmail]=useState(''),[password,setPassword]=useState('');
  useEffect(()=>{let live=true;getSuperAdminSession().then(value=>{if(live)setUser(value)}).catch(()=>{}).finally(()=>{if(live)setChecking(false)});return()=>{live=false}},[]);
  async function login(event:FormEvent){event.preventDefault();setBusy(true);setError('');try{setUser(await loginSuperAdmin(email.trim(),password));setPassword('')}catch(reason){setError(reason instanceof Error?reason.message:'Sign in failed.')}finally{setBusy(false)}}
  async function signOut(){try{await logoutSuperAdmin();setUser(null)}catch(reason){setError(reason instanceof Error?reason.message:'Sign out failed.')}}
  if(checking)return <main className="v25-root v25-auth"><p role="status">Checking session…</p></main>;
  if(user)return <V25AdminPage authenticatedUser={user} onSignOut={signOut}/>;
  return <main className="v25-root v25-auth"><form className="v25-panel v25-login" onSubmit={login}><img src={`${import.meta.env.BASE_URL}k12matrix-logo.svg`} alt="K12Matrix"/><h1>Super Admin Sign In</h1><label>Email<input type="email" autoComplete="username" required value={email} onChange={event=>setEmail(event.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)}/></label>{error&&<p role="alert" className="v25-inline-error">{error}</p>}<button type="submit" className="v25-button primary" disabled={busy}>{busy?'Signing in…':'Sign In'}</button><Link to="/summary">Public dashboard</Link></form></main>;
}
