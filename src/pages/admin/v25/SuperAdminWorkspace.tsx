import {useEffect,useState,type FormEvent} from 'react';
import {Link} from 'react-router-dom';
import {ThemeProvider} from '../../../app/ThemeProvider';
import V25AdminPage from './V25AdminPage';
import {getSuperAdminSession,loginSuperAdmin,logoutSuperAdmin,type SuperAdminUser} from './superadminApi';
import {getAdminSession,loginAdmin,logoutAdmin} from './adminApi';
import {apiGet} from '../../../lib/api';
import './v25.css';
export default function SuperAdminWorkspace({admin=false}:{admin?:boolean}){
  return <ThemeProvider scoped defaultTheme="light" storageKey={admin?'strategic-admin-theme':'strategic-superadmin-theme'}><WorkspaceContent admin={admin}/></ThemeProvider>;
}
function WorkspaceContent({admin}:{admin:boolean}){
  const[user,setUser]=useState<SuperAdminUser|null>(null),[checking,setChecking]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const[email,setEmail]=useState(''),[password,setPassword]=useState(''),[notice,setNotice]=useState('');
  const [method,setMethod]=useState('');
  const [ssoReady,setSsoReady]=useState(false);
  useEffect(()=>{if(admin&&new URLSearchParams(window.location.search).has('authError'))setError('Sign in could not be completed. Check your district account or contact your Super Admin.')},[admin]);
  useEffect(()=>{if(admin)apiGet<{signinMethod:string;google:{configured:boolean};microsoft:{configured:boolean}}>('/api/v1/admin/signin-config').then(config=>{setMethod(config.signinMethod);setSsoReady(config.signinMethod==='Google'?config.google.configured:config.microsoft.configured)}).catch(()=>setError('Sign-in settings are unavailable. Reload and try again.'))},[admin]);
  useEffect(()=>{let live=true;(admin?getAdminSession():getSuperAdminSession()).then(value=>{if(live)setUser(value)}).catch(()=>{}).finally(()=>{if(live)setChecking(false)});return()=>{live=false}},[admin]);
  async function login(event:FormEvent){event.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');try{setUser(await (admin?loginAdmin:loginSuperAdmin)(email.trim(),password));setPassword('')}catch(reason){setError(reason instanceof Error?reason.message:'Sign in failed.')}finally{setBusy(false)}}
  async function signOut(){if(busy)return;setBusy(true);setError('');try{await (admin?logoutAdmin:logoutSuperAdmin)();setUser(null);setEmail('');setPassword('');setNotice('Signed out successfully.')}catch(reason){setError(reason instanceof Error?reason.message:'Sign out failed.')}finally{setBusy(false)}}
  if(checking||(admin&&!method&&!error))return <main className="v25-root v25-auth v25-auth-dark"><p role="status">Checking session…</p></main>;
  if(user)return <>{error&&<div className="v25-root v25-auth-error" role="alert">{error}</div>}<V25AdminPage authenticatedUser={user} onSignOut={signOut} signingOut={busy}/></>;
  return <main className="v25-root v25-auth v25-auth-dark"><form className="v25-panel v25-login" onSubmit={login} aria-busy={busy}><img src={`${import.meta.env.BASE_URL}${'k12matrix-logo.svg'}`} alt="K12Matrix"/><h1>{admin?'Admin':'Super Admin'} Sign In</h1>{notice&&<p role="status" className="v25-auth-status">{notice}</p>}{error&&<p role="alert" className="v25-inline-error">{error}</p>}{(!admin||method==='Userbased')&&<><label>Email<input type="email" disabled={busy} autoComplete="username" required value={email} onChange={event=>setEmail(event.target.value)}/></label><label>Password<input type="password" disabled={busy} autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)}/></label><button type="submit" className="v25-button primary" disabled={busy}>{busy?'Signing in…':'Sign In'}</button></>}{admin&&Boolean(method)&&method!=='Userbased'&&<button type="button" className="v25-button primary" disabled={!ssoReady} onClick={()=>{const provider=method==='Google'?'google':'microsoft';const base=new URL(import.meta.env.BASE_URL,window.location.origin);window.location.assign(new URL(`api/v1/auth/admin/oauth/${provider}/start?return_to=${encodeURIComponent(new URL('admin',base).href)}`,base).href)}}>Sign in with {method}</button>}{admin&&Boolean(method)&&method!=='Userbased'&&!ssoReady&&<p role="alert">District SSO is not fully configured. Contact your Super Admin.</p>}<Link to="/summary">Public dashboard</Link></form><footer className="v25-footer v25-auth-footer"><span>Strategic Plan · V2.5</span><span>Powered by <b>K12Matrix</b></span></footer></main>;
}
