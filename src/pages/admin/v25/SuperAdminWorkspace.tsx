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
  const [providers,setProviders]=useState({google:false,microsoft:false});
  const [method,setMethod]=useState('Userbased');
  const visibleProviders=(['google','microsoft'] as const).filter(provider=>method===(provider==='google'?'Google':'Microsoft'));
  useEffect(()=>{if(admin&&new URLSearchParams(window.location.search).has('authError'))setError('Sign in could not be completed. Check your district account or contact your Super Admin.')},[admin]);
  useEffect(()=>{let live=true;if(admin)apiGet<{signinMethod:string;google:{configured:boolean};microsoft:{configured:boolean}}>('/api/v1/admin/signin-config').then(config=>{if(live){setMethod(config.signinMethod);setProviders({google:config.google.configured,microsoft:config.microsoft.configured})}}).catch(()=>{if(live)setError('Provider sign-in is unavailable. You can still sign in with your email and password.')});return()=>{live=false}},[admin]);
  useEffect(()=>{let live=true;(admin?getAdminSession():getSuperAdminSession()).then(value=>{if(live)setUser(value)}).catch(()=>{}).finally(()=>{if(live)setChecking(false)});return()=>{live=false}},[admin]);
  async function login(event:FormEvent){event.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');try{setUser(await (admin?loginAdmin:loginSuperAdmin)(email.trim(),password));setPassword('')}catch(reason){setError(reason instanceof Error?reason.message:'Sign in failed.')}finally{setBusy(false)}}
  async function signOut(){if(busy)return;setBusy(true);setError('');try{await (admin?logoutAdmin:logoutSuperAdmin)();setUser(null);setEmail('');setPassword('');setNotice('Signed out successfully.')}catch(reason){setError(reason instanceof Error?reason.message:'Sign out failed.')}finally{setBusy(false)}}
  if(checking)return <main className="v25-root v25-auth v25-auth-dark"><p role="status">Checking session…</p></main>;
  if(user)return <>{error&&<div className="v25-root v25-auth-error" role="alert">{error}</div>}<V25AdminPage authenticatedUser={user} onSignOut={signOut} signingOut={busy}/></>;
  return <main className="v25-root v25-auth v25-auth-dark"><form className="v25-panel v25-login" onSubmit={login} aria-busy={busy}>
    <img src={`${import.meta.env.BASE_URL}k12matrix-logo.svg`} alt="K12Matrix"/><h1>{admin?'Admin':'Super Admin'} Sign In</h1>
    {notice&&<p role="status" className="v25-auth-status">{notice}</p>}{error&&<p role="alert" className="v25-inline-error">{error}</p>}
    <label>Email<input type="email" disabled={busy} autoComplete="username" required value={email} onChange={event=>setEmail(event.target.value)}/></label>
    <label>Password<input type="password" disabled={busy} autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)}/></label>
    <button type="submit" className="v25-button primary" disabled={busy}>{busy?'Signing in…':'Sign In'}</button>
    {admin&&visibleProviders.length>0&&<><div className="v25-auth-divider"><span>or</span></div><div className="v25-sso-login">{visibleProviders.map(provider=>{const label=provider==='google'?'Google':'Microsoft';const ready=providers[provider];return <button key={provider} type="button" className={`v25-button v25-provider-${provider}`} disabled={busy||!ready} title={ready?`Sign in with ${label}`:`${label} sign-in is not configured`} onClick={()=>{const base=new URL(import.meta.env.BASE_URL,window.location.origin);window.location.assign(new URL(`api/v1/auth/admin/oauth/${provider}/start?return_to=${encodeURIComponent(new URL('admin',base).href)}`,base).href)}}><ProviderIcon provider={provider}/>Sign in with {label}</button>})}</div></>}
    <Link to="/summary">Public dashboard</Link>
  </form><footer className="v25-footer v25-auth-footer"><span>Strategic Plan · V2.5</span><span>Powered by <b>K12Matrix</b></span></footer></main>;
}

function ProviderIcon({provider}:{provider:'google'|'microsoft'}){return provider==='microsoft'?<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="#f25022" d="M1 1h10v10H1z"/><path fill="#7fba00" d="M13 1h10v10H13z"/><path fill="#00a4ef" d="M1 13h10v10H1z"/><path fill="#ffb900" d="M13 13h10v10H13z"/></svg>:<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285f4" d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c1.9-1.8 2.9-4.3 2.9-7.4Z"/><path fill="#34a853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3v2.6A10 10 0 0 0 12 22Z"/><path fill="#fbbc05" d="M6.4 14c-.4-1.3-.4-2.7 0-4V7.4H3a10 10 0 0 0 0 9.2Z"/><path fill="#ea4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9 5.4L6.4 10C7.2 7.7 9.4 5.9 12 5.9Z"/></svg>}
