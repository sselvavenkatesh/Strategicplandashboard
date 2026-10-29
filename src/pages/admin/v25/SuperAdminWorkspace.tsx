import {useEffect,useState,type FormEvent} from 'react';
import {Link} from 'react-router-dom';
import {useTheme} from '../../../app/ThemeProvider';
import V25AdminPage from './V25AdminPage';
import {getSuperAdminSession,loginSuperAdmin,logoutSuperAdmin,type SuperAdminUser} from './superadminApi';
import './v25.css';
export default function SuperAdminWorkspace(){
  const[user,setUser]=useState<SuperAdminUser|null>(null),[checking,setChecking]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const[email,setEmail]=useState(''),[password,setPassword]=useState(''),[notice,setNotice]=useState('');
  const {theme}=useTheme();
  useEffect(()=>{let live=true;getSuperAdminSession().then(value=>{if(live)setUser(value)}).catch(()=>{}).finally(()=>{if(live)setChecking(false)});return()=>{live=false}},[]);
  async function login(event:FormEvent){event.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');try{setUser(await loginSuperAdmin(email.trim(),password));setPassword('')}catch(reason){setError(reason instanceof Error?reason.message:'Sign in failed.')}finally{setBusy(false)}}
  async function signOut(){if(busy)return;setBusy(true);setError('');try{await logoutSuperAdmin();setUser(null);setEmail('');setPassword('');setNotice('Signed out successfully.')}catch(reason){setError(reason instanceof Error?reason.message:'Sign out failed.')}finally{setBusy(false)}}
  if(checking)return <main className="v25-root v25-auth"><p role="status">Checking session…</p></main>;
  if(user)return <>{error&&<div className="v25-root v25-auth-error" role="alert">{error}</div>}<V25AdminPage authenticatedUser={user} onSignOut={signOut} signingOut={busy}/></>;
  return <main className="v25-root v25-auth"><form className="v25-panel v25-login" onSubmit={login} aria-busy={busy}><img src={`${import.meta.env.BASE_URL}${theme==='light'?'k12matrix-logo-light.svg':'k12matrix-logo.svg'}`} alt="K12Matrix"/><h1>Super Admin Sign In</h1>{notice&&<p role="status" className="v25-auth-status">{notice}</p>}<label>Email<input type="email" disabled={busy} autoComplete="username" required value={email} onChange={event=>setEmail(event.target.value)}/></label><label>Password<input type="password" disabled={busy} autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)}/></label>{error&&<p role="alert" className="v25-inline-error">{error}</p>}<button type="submit" className="v25-button primary" disabled={busy}>{busy?'Signing in…':'Sign In'}</button><Link to="/summary">Public dashboard</Link></form></main>;
}
