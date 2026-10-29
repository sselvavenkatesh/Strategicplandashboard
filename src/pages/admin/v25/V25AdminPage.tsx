import {useEffect, useMemo, useState} from 'react';
import {Link, useLocation, useSearchParams} from 'react-router-dom';
import {ArrowLeft, ArrowRight, BarChart3, Building2, Check, CheckCircle2, ChevronRight, ClipboardList, Eye, Goal, Home, Moon, RotateCcw, Settings2, ShieldCheck, Sun, Trash2, Users, X} from 'lucide-react';
import {useTheme} from '../../../app/ThemeProvider';
import {accessibleRows, emptyAssignments, idColumn, loadDataset, text} from './model';
import type {Assignments, DataRow, Dataset, Kind} from './model';
import {StakeholderSelect,StakeholderContext} from './StakeholderSelect';
import {getSuperAdminWorkspace,saveSuperAdminWorkspace,type SuperAdminUser,type Workspace} from './superadminApi';
import {DataEditor} from './DataEditor';
import {getAdminWorkspace,saveAdminWorkspace} from './adminApi';
import {MasterEditor} from './MasterEditor';
import {MasterTable} from './MasterTable';
import {DataUpload} from './DataUpload';
import {DistrictLogoControl, GoalCountControl} from './DistrictControls';
import {DeleteGoalDialog} from './DeleteGoalDialog';
import {goalDependencies, increaseGoalCount, validateGoalNames} from './goalConfiguration';
import './v25.css';

type Section = 'home' | 'plan' | 'indicators' | 'initiatives';
const menus = [{id: 'home', label: 'Overview', icon: Home}, {id: 'plan', label: 'Strategic Plan Configuration', icon: Settings2}, {id: 'indicators', label: 'Indicator Configuration', icon: BarChart3}, {id: 'initiatives', label: 'Initiative Configuration', icon: ClipboardList}] as const;
const draftKey = 'strategic-v25-ui-draft-v1';
type Draft = {assignments: Assignments; indicatorEdits: Record<string, DataRow>; initiativeEdits: Record<string, DataRow>; profile?: DataRow; goals?: DataRow[]; indicatorMasters?: DataRow[]; initiativeMasters?: DataRow[]; nextGoalNumber?: number};
function newDraft(): Draft {return {assignments: emptyAssignments(), indicatorEdits: {}, initiativeEdits: {}}}
function readDraft(): Draft {
  try {const saved = JSON.parse(sessionStorage.getItem(draftKey) || 'null'); return saved?.assignments?.goals && saved?.assignments?.indicators && saved?.assignments?.initiatives ? {...newDraft(), ...saved} : newDraft()} catch {return newDraft()}
}

export default function V25AdminPage({authenticatedUser,onSignOut,signingOut=false}:{authenticatedUser?:SuperAdminUser;onSignOut?:()=>void;signingOut?:boolean}) {
  const location = useLocation();
  const superAdmin = location.pathname.replace(/\/$/, '').endsWith('/superadmin');
  const [params, setParams] = useSearchParams();
  const requested = params.get('section');
  const section: Section = menus.some(item => item.id === requested) ? requested as Section : 'home';
  const live=Boolean(authenticatedUser);
  const [user] = useState(authenticatedUser?.id ?? '');
  const [busy,setBusy]=useState(false);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [draft, setDraft] = useState<Draft>(()=>live?newDraft():readDraft());
  const [notice, setNotice] = useState('');
  const [configurationError, setConfigurationError] = useState('');
  const [pendingDeleteGoal, setPendingDeleteGoal] = useState<DataRow | null>(null);
  const [masterEditing, setMasterEditing] = useState<{kind: 'indicators' | 'initiatives'; row: DataRow; isNew: boolean} | null>(null);
  const requestedTab = params.get('tab');
  const planTab = requestedTab === 'goals' ? 'goals' : 'district';
  const resourceTab = requestedTab === 'data' ? 'data' : 'master';
  const {theme, toggleTheme} = useTheme();
  const assignments = draft.assignments;
  const stakeholders=dataset?.stakeholders??[];
  const currentUser=authenticatedUser ?? stakeholders.find(person=>person.id===user) ?? {id:'',name:'Admin',email:''};
  useEffect(() => {
    let current = true;
    (live?(superAdmin?getSuperAdminWorkspace():getAdminWorkspace()):loadDataset()).then(data => {if (current) {setDataset(data); if(live)setDraft({...newDraft(),assignments:(data as Workspace).assignments});setError('')}}).catch(reason => {if (current) setError(reason instanceof Error ? reason.message : 'Unable to load district data.')});
    return () => {current = false};
  }, [retry,live,superAdmin]);
  useEffect(() => {if(live)return;try {sessionStorage.setItem(draftKey, JSON.stringify(draft))} catch {setNotice('Tab storage is unavailable. Your changes will last until you leave this page.')}}, [draft,live]);
  useEffect(() => {if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 5000); return () => clearTimeout(timer)}, [notice]);
  const profile = draft.profile ?? dataset?.profile ?? {};
  const goals = draft.goals ?? dataset?.goals ?? [];
  const visibleGoals = goals.filter(row => superAdmin || (assignments.goals[text(row, 'Goal ID')] ?? []).includes(user));
  const allIndicators = useMemo(() => draft.indicatorMasters ?? dataset?.indicators ?? [], [draft.indicatorMasters, dataset]);
  const allInitiatives = useMemo(() => draft.initiativeMasters ?? dataset?.initiatives ?? [], [draft.initiativeMasters, dataset]);
  const indicators = useMemo(() => superAdmin ? allIndicators : accessibleRows(allIndicators, 'indicators', user, assignments), [allIndicators, superAdmin, user, assignments]);
  const initiatives = useMemo(() => superAdmin ? allInitiatives : accessibleRows(allInitiatives, 'initiatives', user, assignments), [allInitiatives, superAdmin, user, assignments]);
  const kind = section === 'initiatives' ? 'initiatives' : 'indicators';
  const master = kind === 'indicators' ? indicators : initiatives;
  const baseData = kind === 'indicators' ? dataset?.indicatorData ?? [] : dataset?.initiativeData ?? [];
  const edits = kind === 'indicators' ? draft.indicatorEdits : draft.initiativeEdits;
  const baseKeys = new Set(baseData.map(row => text(row, '__previewKey')));
  const sourceData = [...baseData, ...Object.values(edits).filter(row => !baseKeys.has(text(row, '__previewKey')))];
  const nameColumn = kind === 'indicators' ? 'Indicator Name' : 'Initiative Name';
  const mastersById = new Map(master.map(row => [text(row, idColumn(kind)), row]));
  const allowedIds = new Set(master.map(row => text(row, idColumn(kind))));
  const indexedData = sourceData.map((original, index) => {const row = edits[text(original, '__previewKey')] ?? original; const definition = mastersById.get(text(row, idColumn(kind))); return {row: {...row, [nameColumn]: definition?.[nameColumn] ?? row[nameColumn], 'Goal ID': definition?.['Goal ID'] ?? row['Goal ID'], 'Goal Name': text(goals.find(goal => goal['Goal ID']===(definition?.['Goal ID'] ?? row['Goal ID'])) ?? {}, 'Goal Name')}, index}}).filter(({row}) => allowedIds.has(text(row, idColumn(kind))));
  const navigateSection=(next:Section)=>{
    if(section==='plan'&&next!=='plan'&&(draft.profile||draft.goals||JSON.stringify(assignments.goals)!==JSON.stringify((dataset as Workspace|null)?.assignments?.goals??{}))){
      if(!window.confirm('Discard unsaved configuration changes?'))return;
      setDraft({...newDraft(),assignments:(dataset as Workspace).assignments});
    }
    setParams(next==='home'?{}:{section:next});
  };
  const selectTab = (tab: string) => setParams({section, tab});
  function assign(kind: Kind, id: string, value: string[]) {setDraft(previous => ({...previous, assignments: {...previous.assignments, [kind]: {...previous.assignments[kind], [id]: value}}}))}
  function updateProfile(field: string, value: string) {setDraft(previous => ({...previous, profile: {...(previous.profile ?? dataset?.profile), [field]: value}}))}
  function updateGoal(index: number, field: string, value: string) {setDraft(previous => ({...previous, goals: (previous.goals ?? dataset?.goals ?? []).map((row, i) => i === index ? {...row, [field]: value} : row)}))}
  function changeGoalCount(count: number) {
    if (!superAdmin) return;
    try {
      const result = increaseGoalCount(goals, count, draft.nextGoalNumber);
      setDraft(previous => ({...previous, ...result, profile: {...(previous.profile ?? dataset?.profile), 'Total Goals': result.goals.length}}));
      setConfigurationError('');
      if (count > goals.length) {setParams({section: 'plan', tab: 'goals'}); setNotice(`${count - goals.length} goal(s) added. Enter their names and save.`)}
    } catch (reason) {setConfigurationError(reason instanceof Error ? reason.message : 'Check the goal count.')}
  }
  async function persist(change:Record<string,unknown>){
    if(!live||!dataset?.revision)throw new Error('Sign in with your district account.');
    setBusy(true);setConfigurationError('');
    try{if(!superAdmin&&change.action!=='reporting')throw new Error('Configuration and master definitions are view only.');
      const fresh=superAdmin?await saveSuperAdminWorkspace(dataset.revision,change):await saveAdminWorkspace(dataset.revision,String(change.kind),change.dataRows as DataRow[]);setDataset(fresh);setDraft({...newDraft(),assignments:fresh.assignments});setNotice('Details are saved.');}
    finally{setBusy(false)}
  }
  async function saveConfiguration(){
    try{validateGoalNames(goals);await persist({action:'configuration',profile,goals,owners:assignments.goals})}
    catch(reason){setConfigurationError(reason instanceof Error?reason.message:'Save failed.')}
  }
  async function deleteGoal(){
    if(!pendingDeleteGoal||getGoalDependencies(text(pendingDeleteGoal,'Goal ID')).total||goals.length<=1)return;
    try{await persist({action:'delete_goal',goalId:text(pendingDeleteGoal,'Goal ID')});setPendingDeleteGoal(null)}
    catch(reason){setNotice(reason instanceof Error?reason.message:'Deletion failed.')}
  }
  function getGoalDependencies(id: string) {
    const indicatorData = [...(dataset?.indicatorData ?? []), ...Object.values(draft.indicatorEdits)];
    const initiativeData = [...(dataset?.initiativeData ?? []), ...Object.values(draft.initiativeEdits)];
    // Edits retain the source key; avoid counting the same reporting row twice.
    const distinct = (rows: DataRow[]) => [...new Map(rows.map(row => [text(row, '__previewKey'), row])).values()];
    return goalDependencies(id, allIndicators, allInitiatives, distinct(indicatorData), distinct(initiativeData));
  }
  function addMaster(goalFilter = '') {
    const prefix = kind === 'indicators' ? 'ID' : 'IN';
    const records = kind === 'indicators' ? allIndicators : allInitiatives;
    const next = 1 + Math.max(0, ...records.map(row => Number(text(row, idColumn(kind)).replace(new RegExp(`^${prefix}`), '')) || 0));
    const row: DataRow = {[idColumn(kind)]: `${prefix}${next}`, [nameColumn]: '', 'Goal ID': goalFilter || text(goals[0] ?? {}, 'Goal ID')};
    if (kind === 'indicators') {row['Indicator Type'] = 'Percent'; row['KPI Nature'] = 'Positive'} else row['Total Sub Initiatives'] = 0;
    setMasterEditing({kind, row, isNew: true});
  }
  async function saveMaster(row:DataRow,dataRows:DataRow[]){
    if(!masterEditing||!live)return;
    await persist({action:'masters',kind:masterEditing.kind,records:[row],create:masterEditing.isNew,owners:{[text(row,idColumn(masterEditing.kind))]:[]},dataRows});
    setMasterEditing(null);
  }
  async function uploadData(rows:DataRow[]){await persist({action:'reporting',kind,dataRows:rows})}
  function accessMode(resource: 'indicators' | 'initiatives') {return Object.values(assignments[resource]).some(users => users.includes(user)) ? 'Goal access with item restrictions' : 'Inherited from assigned goals'}
  const sectionTitle = menus.find(menu => menu.id === section)?.label;

  return <StakeholderContext.Provider value={stakeholders}><div className="v25-root">
    <div className="v25-layout"><aside className="v25-sidebar">
      <Link to="/" className="v25-brand"><img src={`${import.meta.env.BASE_URL}k12matrix-logo.svg`} alt="K12Matrix"/></Link>
      <div className="v25-workspace"><span className="v25-workspace-icon"><Building2 size={20}/></span><div><b>Strategic Plan</b><span>{superAdmin ? 'Super Admin workspace' : 'Admin workspace'}</span></div></div>
      <div className="v25-nav-caption">WORKSPACE</div><nav aria-label="Administration">{menus.map(menu => {const Icon = menu.icon; return <button type="button" key={menu.id} aria-current={section === menu.id ? 'page' : undefined} className={section === menu.id ? 'active' : ''} onClick={() => navigateSection(menu.id)}><Icon size={18}/><span>{menu.label}</span>{section === menu.id && <ChevronRight size={14}/>}</button>})}</nav>
      <div className="v25-sidebar-bottom"><Link to="/summary"><ArrowLeft size={16}/> Public dashboard</Link><div className="v25-person"><span className="v25-avatar">{superAdmin ? 'SA' : currentUser.name.split(' ').map(word => word[0]).join('')}</span><div><b>{superAdmin ? authenticatedUser?.name ?? 'Super Admin' : currentUser.name}</b><span>{superAdmin ? 'District configuration' : 'Assigned data management'}</span></div></div></div>
    </aside>
    <main className="v25-main"><header className="v25-topbar"><div className="v25-breadcrumb">Strategic Plan <ChevronRight size={13}/><span>{superAdmin ? 'Super Admin' : 'Admin'}</span></div><div className="v25-top-actions"><button className="v25-icon" aria-label="Toggle theme" onClick={toggleTheme}>{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button>{onSignOut&&<button className="v25-button" disabled={signingOut} onClick={onSignOut}>{signingOut?'Signing out…':'Sign Out'}</button>}</div></header>
      <div className="v25-content"><div className="v25-page-heading"><div><span className="v25-eyebrow">{superAdmin ? 'DISTRICT ADMINISTRATION' : 'YOUR WORKSPACE'}</span><h1>{section === 'home' ? superAdmin ? 'District overview' : `Welcome, ${currentUser.name.split(' ')[0]}` : sectionTitle}</h1></div><button className="v25-button" disabled={busy} onClick={()=>{if(window.confirm('Reload saved data and discard unsaved changes?')){setDraft(newDraft());setRetry(value=>value+1)}}}><RotateCcw size={15}/> Reload</button></div>

      {error ? <div className="v25-panel v25-error" role="alert"><h2>District data could not be loaded</h2><p>{error}</p><button className="v25-button" onClick={() => {setError(''); setRetry(value => value + 1)}}>Try again</button></div> : !dataset ? <div className="v25-panel v25-loading" role="status">Loading existing district data…</div> : <>
      {section === 'home' && <>
        <section className="v25-district-card"><div className="v25-district-symbol">{profile['District Logo'] ? <img src={text(profile, 'District Logo')} alt="District logo"/> : <Building2 size={32}/>}</div><div><span className="v25-eyebrow">{text(profile, 'Strategic Plan Duration')}</span><h2>{text(profile, 'School District Name')}</h2><p>{text(profile, 'Strategic Plan Name')}</p></div><span className="v25-badge"><ShieldCheck size={14}/>{superAdmin ? 'District Super Admin' : 'District Admin'}</span></section>
        <div className="v25-stat-grid">{[{label: superAdmin ? 'Goals' : 'Assigned goals', value: visibleGoals.length, icon: Goal, section: 'plan' as Section}, {label: superAdmin ? 'Indicators' : 'Assigned indicators', value: indicators.length, icon: BarChart3, section: 'indicators' as Section}, {label: superAdmin ? 'Initiatives' : 'Assigned initiatives', value: initiatives.length, icon: ClipboardList, section: 'initiatives' as Section}].map(stat => <button className="v25-stat" key={stat.label} onClick={() => stat.section === 'plan' ? setParams({section: 'plan', tab: 'goals'}) : navigateSection(stat.section)}><div><span>{stat.label}</span><stat.icon size={20}/></div><b>{stat.value}</b></button>)}</div>
        <section className="v25-panel"><div className="v25-panel-title"><div><h2>{superAdmin ? 'Stakeholder assignments' : 'Your assigned goals'}</h2></div><Users size={22}/></div>
          {superAdmin ? <div className="v25-quick-actions"><button className="v25-button primary" onClick={() => setParams({section: 'plan', tab: 'goals'})}>Configure stakeholders <ArrowRight size={15}/></button></div> : visibleGoals.length ? <div className="v25-assigned-goals">{visibleGoals.map(goal => <article key={text(goal, 'Goal ID')}><span className="v25-goal-number">{text(goal, 'Goal ID')}</span><div><h3>{text(goal, 'Goal Name')}</h3><p>{text(goal, 'Goal Description')}</p></div></article>)}</div> : <Empty title="No goals assigned yet"/>}
        </section>

      </>}
      {section === 'plan' && <>
        {configurationError && <p className="v25-inline-error" role="alert">{configurationError}</p>}
        <div className="v25-section-tabs" role="group" aria-label="Strategic Plan sections"><button aria-pressed={planTab === 'district'} onClick={() => selectTab('district')}>District & Strategic Plan</button><button aria-pressed={planTab === 'goals'} onClick={() => selectTab('goals')}>{superAdmin ? 'Goal Master' : 'Assigned Goals'} <span>{visibleGoals.length}</span></button></div>
        {planTab === 'district' && <section className="v25-panel"><div className="v25-panel-title"><div><h2>District & Strategic Plan</h2></div>{!superAdmin && <span className="v25-badge"><Eye size={14}/> View only</span>}</div>
          <div className="v25-form-grid">{['School District Name', 'Strategic Plan Name', 'District Logo', 'Strategic Plan Duration', 'Total Goals', 'Admin Signin Method', 'Mission Statement', 'Vision Statement'].filter(field=>superAdmin||field!=='Admin Signin Method').map(field => field === 'District Logo' ? <DistrictLogoControl key={field} logo={text(profile, field)} readOnly={!superAdmin} onChange={logo => updateProfile(field, logo)}/> : field === 'Total Goals' ? superAdmin ? <GoalCountControl key={field} count={goals.length} onChange={changeGoalCount} onError={setConfigurationError}/> : <label key={field}>Number of Goals<input readOnly value={goals.length}/></label> : <label key={field} className="">{field}{field.endsWith('Statement') ? <textarea readOnly={!superAdmin} value={text(profile, field)} onChange={event => updateProfile(field, event.target.value)}/> : field === 'Admin Signin Method' && superAdmin ? <select value={text(profile, field)} onChange={event => updateProfile(field, event.target.value)}>{['Userbased', 'Google', 'Microsoft'].map(method => <option key={method}>{method}</option>)}</select> : <input readOnly={!superAdmin} value={text(profile, field)} onChange={event => updateProfile(field, event.target.value)}/>}</label>)}
          {(text(profile, 'Admin Signin Method') === 'Google' ? ['Google Client ID', 'Google Auth ID'] : text(profile, 'Admin Signin Method') === 'Microsoft' ? ['Microsoft Client ID', 'Microsoft Tenant ID', 'Microsoft Auth ID'] : []).map(field => <label key={field}>{field}<input readOnly={!superAdmin} value={text(profile, field)} onChange={event => updateProfile(field, event.target.value)}/></label>)}</div>
          {superAdmin && <div className="v25-panel-footer"><button className="v25-button primary v25-save" onClick={saveConfiguration}><Check size={14}/> Save</button></div>}
        </section>}
        {planTab === 'goals' && <section className="v25-panel"><div className="v25-panel-title"><div><h2>{superAdmin ? 'Goal Master' : 'Assigned Goals'} <span className="v25-count">{visibleGoals.length}</span></h2></div>{superAdmin ? <GoalCountControl count={goals.length} onChange={changeGoalCount} onError={setConfigurationError}/> : <span className="v25-badge"><Eye size={14}/> View only</span>}</div>
          <div className="v25-goal-grid">{visibleGoals.map(goal => {const index = goals.indexOf(goal); const id = text(goal, 'Goal ID'); return <article className="v25-goal-card" key={id}><div className="v25-goal-card-head"><span className="v25-goal-number">{id}</span><span>{allIndicators.filter(row => row['Goal ID'] === id).length} indicators · {allInitiatives.filter(row => row['Goal ID'] === id).length} initiatives</span>{superAdmin && <button type="button" className="v25-delete-goal" aria-label={`Delete ${text(goal, 'Goal Name') || id}`} onClick={() => setPendingDeleteGoal(goal)}><Trash2 size={12}/> Delete</button>}</div>{superAdmin ? <><label>Goal Name<input value={text(goal, 'Goal Name')} onChange={event => updateGoal(index, 'Goal Name', event.target.value)}/></label><label>Goal Description<textarea value={text(goal, 'Goal Description')} onChange={event => updateGoal(index, 'Goal Description', event.target.value)}/></label><div className="v25-stakeholder-field"><span>Stakeholder</span><StakeholderSelect label={`Stakeholder for ${text(goal, 'Goal Name')}`} value={assignments.goals[id] ?? []} onChange={value => assign('goals', id, value)}/></div></> : <><h3>{text(goal, 'Goal Name')}</h3><p>{text(goal, 'Goal Description')}</p><span className="v25-badge"><Check size={13}/> Assigned to you</span></>}</article>})}</div>
          {!visibleGoals.length && <Empty title="No goals assigned yet"/>}
          {superAdmin && <div className="v25-panel-footer"><button className="v25-button primary v25-save" onClick={saveConfiguration}><Check size={15}/> Save</button></div>}
        </section>}
      </>}
      {(section === 'indicators' || section === 'initiatives') && <>
        <div className="v25-section-tabs" role="group" aria-label="Configuration sections"><button aria-pressed={resourceTab === 'master'} onClick={() => selectTab('master')}>{superAdmin ? kind === 'indicators' ? 'Indicator Master' : 'Initiative Master' : kind === 'indicators' ? 'Assigned Indicators' : 'Assigned Initiatives'} <span>{master.length}</span></button><button aria-pressed={resourceTab === 'data'} onClick={() => selectTab('data')}>{kind === 'indicators' ? 'Indicator Data' : 'Initiative Data'} <span>{indexedData.length}</span></button></div>
        {resourceTab === 'master' && <section className="v25-panel"><MasterTable key={`${kind}-${user}-${superAdmin}`} kind={kind} records={master} goals={goals} assignments={assignments[kind]} goalAssignments={assignments.goals} superAdmin={superAdmin} accessMode={accessMode(kind)} onAdd={addMaster} onSave={(records,owners)=>persist({action:'masters',kind,records,owners})}/></section>}
        {resourceTab === 'data' && <section className="v25-panel"><div className="v25-panel-title"><div><h2>{kind === 'indicators' ? 'Indicator' : 'Initiative'} Data <span className="v25-count">{indexedData.length}</span></h2></div><DataUpload key={`${kind}-${user}-${superAdmin}`} kind={kind} masters={master} goals={goals} rows={indexedData.map(item => item.row)} onUpload={uploadData} allowedRoles={live?['All','Admin']:['All']}/></div>
          {indexedData.length ? <DataEditor key={`${kind}-${user}-${superAdmin}`} kind={kind} rows={indexedData.map(item => item.row)} onSave={uploadData}/> : <Empty title="No reporting data in your scope"/>}
        </section>}
      </>}
      </>}
      <footer className="v25-footer"><span>Strategic Plan · V2.5</span><span>Powered by <b>K12Matrix</b></span></footer>
      </div>
    </main></div>
    {masterEditing && superAdmin && <MasterEditor kind={masterEditing.kind} row={masterEditing.row} isNew={masterEditing.isNew} goals={goals} records={masterEditing.kind === 'indicators' ? allIndicators : allInitiatives} onClose={() => setMasterEditing(null)} onSave={saveMaster}/>}
    {pendingDeleteGoal && superAdmin && <DeleteGoalDialog goal={pendingDeleteGoal} dependencies={getGoalDependencies(text(pendingDeleteGoal, 'Goal ID'))} lastGoal={goals.length <= 1} onClose={() => setPendingDeleteGoal(null)} onDelete={deleteGoal}/>}
    {notice && <div className="v25-toast" role="status" aria-live="polite"><span className="v25-notice-icon"><CheckCircle2 size={17}/></span><span>{notice}</span><button className="v25-icon" aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={14}/></button></div>}
    {busy&&<div className="v25-saving" role="status"><span>Saving…</span></div>}
  </div></StakeholderContext.Provider>;
}
function Empty({title}: {title: string}) {return <div className="v25-empty"><Users size={26}/><h3>{title}</h3></div>}
