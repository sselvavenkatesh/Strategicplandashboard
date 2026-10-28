import {useEffect, useMemo, useState} from 'react';
import {Link, useLocation, useSearchParams} from 'react-router-dom';
import {ArrowLeft, ArrowRight, BarChart3, Building2, Check, ChevronRight, ClipboardList, Eye, FlaskConical, Goal, Home, Moon, RotateCcw, Settings2, ShieldCheck, Sun, Trash2, Users} from 'lucide-react';
import {useTheme} from '../../../app/ThemeProvider';
import {accessibleRows, emptyAssignments, idColumn, loadDataset, stakeholders, text} from './model';
import type {Assignments, DataRow, Dataset, Kind} from './model';
import {StakeholderSelect} from './StakeholderSelect';
import {DataEditor} from './DataEditor';
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

export default function V25AdminPage() {
  const location = useLocation();
  const superAdmin = location.pathname.replace(/\/$/, '').endsWith('/superadmin');
  const [params, setParams] = useSearchParams();
  const requested = params.get('section');
  const section: Section = menus.some(item => item.id === requested) ? requested as Section : 'home';
  const [user, setUser] = useState(() => sessionStorage.getItem('strategic-v25-review-user') || stakeholders[0].id);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [draft, setDraft] = useState<Draft>(readDraft);
  const [notice, setNotice] = useState('');
  const [configurationError, setConfigurationError] = useState('');
  const [pendingDeleteGoal, setPendingDeleteGoal] = useState<DataRow | null>(null);
  const [masterEditing, setMasterEditing] = useState<{kind: 'indicators' | 'initiatives'; row: DataRow; isNew: boolean} | null>(null);
  const requestedTab = params.get('tab');
  const planTab = requestedTab === 'goals' ? 'goals' : 'district';
  const resourceTab = requestedTab === 'data' ? 'data' : 'master';
  const {theme, toggleTheme} = useTheme();
  const assignments = draft.assignments;
  const currentUser = stakeholders.find(person => person.id === user) ?? stakeholders[0];
  useEffect(() => {
    let current = true;
    loadDataset().then(data => {if (current) {setDataset(data); setError('')}}).catch(reason => {if (current) setError(reason instanceof Error ? reason.message : 'Unable to load district data.')});
    return () => {current = false};
  }, [retry]);
  useEffect(() => {try {sessionStorage.setItem(draftKey, JSON.stringify(draft))} catch {setNotice('Tab storage is unavailable. Your changes will last until you leave this page.')}}, [draft]);
  useEffect(() => {sessionStorage.setItem('strategic-v25-review-user', user)}, [user]);
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
  const indexedData = sourceData.map((original, index) => {const row = edits[text(original, '__previewKey')] ?? original; const definition = mastersById.get(text(row, idColumn(kind))); return {row: {...row, [nameColumn]: definition?.[nameColumn] ?? row[nameColumn], 'Goal ID': definition?.['Goal ID'] ?? row['Goal ID']}, index}}).filter(({row}) => allowedIds.has(text(row, idColumn(kind))));
  const navigateSection = (next: Section) => setParams(next === 'home' ? {} : {section: next});
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
      if (count > goals.length) {setParams({section: 'plan', tab: 'goals'}); setNotice(`${count - goals.length} goal(s) added locally.`)}
    } catch (reason) {setConfigurationError(reason instanceof Error ? reason.message : 'Check the goal count.')}
  }
  function saveConfiguration() {
    try {validateGoalNames(goals); setConfigurationError(''); setNotice('Saved locally.')}
    catch (reason) {setConfigurationError(reason instanceof Error ? reason.message : 'Check the goals.')}
  }
  function deleteGoal() {
    if (!superAdmin || !pendingDeleteGoal || goals.length <= 1) return;
    const id = text(pendingDeleteGoal, 'Goal ID');
    if (getGoalDependencies(id).total) return;
    const remaining = goals.filter(goal => goal['Goal ID'] !== id);
    const ownership = {...assignments.goals}; delete ownership[id];
    setDraft(previous => ({...previous, goals: remaining, profile: {...(previous.profile ?? dataset?.profile), 'Total Goals': remaining.length}, assignments: {...previous.assignments, goals: ownership}}));
    setPendingDeleteGoal(null); setConfigurationError(''); setNotice('Goal deleted locally.');
  }
  function getGoalDependencies(id: string) {
    const indicatorData = [...(dataset?.indicatorData ?? []), ...Object.values(draft.indicatorEdits)];
    const initiativeData = [...(dataset?.initiativeData ?? []), ...Object.values(draft.initiativeEdits)];
    // Edits retain the source key; avoid counting the same reporting row twice.
    const distinct = (rows: DataRow[]) => [...new Map(rows.map(row => [text(row, '__previewKey'), row])).values()];
    return goalDependencies(id, allIndicators, allInitiatives, distinct(indicatorData), distinct(initiativeData));
  }
  function exampleAssignments() {
    setDraft(previous => ({...previous, assignments: {goals: {G1: ['6', '7'], G2: ['8'], G3: ['9'], G4: ['10']}, indicators: {ID1: ['6']}, initiatives: {IN1: ['6']}}}));
    setNotice('Example assignments loaded in this tab. John has explicit access; Sarah inherits Goal 1 access.');
  }
  function addMaster(goalFilter = '') {
    const prefix = kind === 'indicators' ? 'ID' : 'IN';
    const records = kind === 'indicators' ? allIndicators : allInitiatives;
    const next = 1 + Math.max(0, ...records.map(row => Number(text(row, idColumn(kind)).replace(new RegExp(`^${prefix}`), '')) || 0));
    const row: DataRow = {[idColumn(kind)]: `${prefix}${next}`, [nameColumn]: '', 'Goal ID': goalFilter || text(goals[0] ?? {}, 'Goal ID')};
    if (kind === 'indicators') {row['Indicator Type'] = 'Percent'; row['KPI Nature'] = 'Positive'} else row['Total Sub Initiatives'] = 0;
    setMasterEditing({kind, row, isNew: true});
  }
  function saveMaster(row: DataRow, dataRows: DataRow[]) {
    if (!masterEditing || !superAdmin) return;
    const editedKind = masterEditing.kind;
    const key = editedKind === 'indicators' ? 'indicatorMasters' : 'initiativeMasters';
    const originalRecords = editedKind === 'indicators' ? allIndicators : allInitiatives;
    const records = masterEditing.isNew ? [...originalRecords, row] : originalRecords.map(record => record[idColumn(editedKind)] === row[idColumn(editedKind)] ? row : record);
    setDraft(previous => ({...previous, [key]: records, initiativeEdits: {...previous.initiativeEdits, ...Object.fromEntries(dataRows.map(item => [text(item, '__previewKey'), item]))}}));
    setMasterEditing(null); setNotice('Saved locally.');
  }
  function uploadData(rows: DataRow[]) {
    const key = kind === 'indicators' ? 'indicatorEdits' : 'initiativeEdits';
    setDraft(previous => ({...previous, [key]: {...previous[key], ...Object.fromEntries(rows.map(row => [text(row, '__previewKey'), row]))}}));
    setNotice(`${rows.length} records uploaded locally.`);
  }
  function accessMode(resource: 'indicators' | 'initiatives') {return Object.values(assignments[resource]).some(users => users.includes(user)) ? 'Explicit assignment' : 'Inherited from assigned goals'}
  const sectionTitle = menus.find(menu => menu.id === section)?.label;

  return <div className="v25-root">
    <div className="v25-review-bar"><span><FlaskConical size={15}/><b>V2.5 preview</b><span className="v25-local-label">Local edits only</span></span><div><Link className={superAdmin ? 'selected' : ''} to="/superadmin">Super Admin</Link><Link className={!superAdmin ? 'selected' : ''} to="/admin">Admin</Link></div></div>
    <div className="v25-layout"><aside className="v25-sidebar">
      <Link to="/" className="v25-brand"><img src={`${import.meta.env.BASE_URL}k12matrix-logo.svg`} alt="K12Matrix"/></Link>
      <div className="v25-workspace"><span className="v25-workspace-icon"><Building2 size={20}/></span><div><b>Strategic Plan</b><span>{superAdmin ? 'Super Admin workspace' : 'Admin workspace'}</span></div></div>
      <div className="v25-nav-caption">WORKSPACE</div><nav aria-label="Administration">{menus.map(menu => {const Icon = menu.icon; return <button type="button" key={menu.id} aria-current={section === menu.id ? 'page' : undefined} className={section === menu.id ? 'active' : ''} onClick={() => navigateSection(menu.id)}><Icon size={18}/><span>{menu.label}</span>{section === menu.id && <ChevronRight size={14}/>}</button>})}</nav>
      <div className="v25-sidebar-bottom"><Link to="/summary"><ArrowLeft size={16}/> Public dashboard</Link><div className="v25-person"><span className="v25-avatar">{superAdmin ? 'SA' : currentUser.name.split(' ').map(word => word[0]).join('')}</span><div><b>{superAdmin ? 'District Super Admin' : currentUser.name}</b><span>{superAdmin ? 'District configuration' : 'Assigned data management'}</span></div></div></div>
    </aside>
    <main className="v25-main"><header className="v25-topbar"><div className="v25-breadcrumb">Strategic Plan <ChevronRight size={13}/><span>{superAdmin ? 'Super Admin' : 'Admin'}</span></div><div className="v25-top-actions">{!superAdmin && <label className="v25-review-as">Review as<select aria-label="Review as Admin" value={user} onChange={event => setUser(event.target.value)}>{stakeholders.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>}<button className="v25-icon" aria-label="Toggle theme" onClick={toggleTheme}>{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button><span className="v25-version">V2.5</span></div></header>
      <div className="v25-content"><div className="v25-page-heading"><div><span className="v25-eyebrow">{superAdmin ? 'DISTRICT ADMINISTRATION' : 'YOUR WORKSPACE'}</span><h1>{section === 'home' ? superAdmin ? 'District overview' : `Welcome, ${currentUser.name.split(' ')[0]}` : sectionTitle}</h1></div>{superAdmin && <button className="v25-button" onClick={() => {if (window.confirm('Reset all V2.5 preview changes in this tab? Production data will not change.')) {setDraft(newDraft()); setNotice('Preview changes reset.')}}}><RotateCcw size={15}/> Reset preview</button>}</div>

      {error ? <div className="v25-panel v25-error" role="alert"><h2>District data could not be loaded</h2><p>{error}</p><button className="v25-button" onClick={() => {setError(''); setRetry(value => value + 1)}}>Try again</button></div> : !dataset ? <div className="v25-panel v25-loading" role="status">Loading existing district data…</div> : <>
      {section === 'home' && <>
        <section className="v25-district-card"><div className="v25-district-symbol">{profile['District Logo'] ? <img src={text(profile, 'District Logo')} alt="District logo"/> : <Building2 size={32}/>}</div><div><span className="v25-eyebrow">{text(profile, 'Strategic Plan Duration')}</span><h2>{text(profile, 'School District Name')}</h2><p>{text(profile, 'Strategic Plan Name')}</p></div><span className="v25-badge"><ShieldCheck size={14}/>{superAdmin ? 'District Super Admin' : 'District Admin'}</span></section>
        <div className="v25-stat-grid">{[{label: superAdmin ? 'Goals' : 'Assigned goals', value: visibleGoals.length, icon: Goal, section: 'plan' as Section}, {label: superAdmin ? 'Indicators' : 'Assigned indicators', value: indicators.length, icon: BarChart3, section: 'indicators' as Section}, {label: superAdmin ? 'Initiatives' : 'Assigned initiatives', value: initiatives.length, icon: ClipboardList, section: 'initiatives' as Section}].map(stat => <button className="v25-stat" key={stat.label} onClick={() => stat.section === 'plan' ? setParams({section: 'plan', tab: 'goals'}) : navigateSection(stat.section)}><div><span>{stat.label}</span><stat.icon size={20}/></div><b>{stat.value}</b></button>)}</div>
        <section className="v25-panel"><div className="v25-panel-title"><div><h2>{superAdmin ? 'Stakeholder assignments' : 'Your assigned goals'}</h2></div><Users size={22}/></div>
          {superAdmin ? <div className="v25-quick-actions"><button className="v25-button primary" onClick={() => setParams({section: 'plan', tab: 'goals'})}>Configure stakeholders <ArrowRight size={15}/></button><button className="v25-button" onClick={exampleAssignments}>Load example assignments</button></div> : visibleGoals.length ? <div className="v25-assigned-goals">{visibleGoals.map(goal => <article key={text(goal, 'Goal ID')}><span className="v25-goal-number">{text(goal, 'Goal ID')}</span><div><h3>{text(goal, 'Goal Name')}</h3><p>{text(goal, 'Goal Description')}</p></div></article>)}</div> : <Empty title="No goals assigned yet"/>}
        </section>

      </>}
      {section === 'plan' && <>
        {configurationError && <p className="v25-inline-error" role="alert">{configurationError}</p>}
        <div className="v25-section-tabs" role="group" aria-label="Strategic Plan sections"><button aria-pressed={planTab === 'district'} onClick={() => selectTab('district')}>District & Strategic Plan</button><button aria-pressed={planTab === 'goals'} onClick={() => selectTab('goals')}>{superAdmin ? 'Goal Master' : 'Assigned Goals'} <span>{visibleGoals.length}</span></button></div>
        {planTab === 'district' && <section className="v25-panel"><div className="v25-panel-title"><div><h2>District & Strategic Plan</h2></div>{!superAdmin && <span className="v25-badge"><Eye size={14}/> View only</span>}</div>
          <div className="v25-form-grid">{['School District Name', 'Strategic Plan Name', 'District Logo', 'Strategic Plan Duration', 'Total Goals', 'Admin Signin Method', 'Mission Statement', 'Vision Statement'].map(field => field === 'District Logo' ? <DistrictLogoControl key={field} logo={text(profile, field)} readOnly={!superAdmin} onChange={logo => updateProfile(field, logo)}/> : field === 'Total Goals' ? superAdmin ? <GoalCountControl key={field} count={goals.length} onChange={changeGoalCount} onError={setConfigurationError}/> : <label key={field}>Number of Goals<input readOnly value={goals.length}/></label> : <label key={field} className="">{field}{field.endsWith('Statement') ? <textarea readOnly={!superAdmin} value={text(profile, field)} onChange={event => updateProfile(field, event.target.value)}/> : field === 'Admin Signin Method' && superAdmin ? <select value={text(profile, field)} onChange={event => updateProfile(field, event.target.value)}>{['Userbased', 'Google', 'Microsoft'].map(method => <option key={method}>{method}</option>)}</select> : <input readOnly={!superAdmin} value={text(profile, field)} onChange={event => updateProfile(field, event.target.value)}/>}</label>)}
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
        {resourceTab === 'master' && <section className="v25-panel"><MasterTable key={`${kind}-${user}-${superAdmin}`} kind={kind} records={master} goals={goals} assignments={assignments[kind]} superAdmin={superAdmin} accessMode={accessMode(kind)} onAdd={addMaster} onSave={(records, owners) => {if (!superAdmin) return; setDraft(previous => ({...previous, [kind === 'indicators' ? 'indicatorMasters' : 'initiativeMasters']: records, assignments: {...previous.assignments, [kind]: owners}})); setNotice('Saved locally.')}}/></section>}
        {resourceTab === 'data' && <section className="v25-panel"><div className="v25-panel-title"><div><h2>{kind === 'indicators' ? 'Indicator' : 'Initiative'} Data <span className="v25-count">{indexedData.length}</span></h2></div><DataUpload key={`${kind}-${user}-${superAdmin}`} kind={kind} masters={master} goals={goals} rows={indexedData.map(item => item.row)} onUpload={uploadData}/></div>
          {indexedData.length ? <DataEditor key={`${kind}-${user}-${superAdmin}`} kind={kind} rows={indexedData.map(item => item.row)} onSave={(index, row) => {const rowKey = text(sourceData[indexedData[index].index], '__previewKey'); setDraft(previous => ({...previous, [kind === 'indicators' ? 'indicatorEdits' : 'initiativeEdits']: {...(kind === 'indicators' ? previous.indicatorEdits : previous.initiativeEdits), [rowKey]: row}})); setNotice('Saved locally.')}}/> : <Empty title="No reporting data in your scope"/>}
        </section>}
      </>}
      </>}
      <footer className="v25-footer"><span>Strategic Plan · V2.5</span><span>Powered by <b>K12Matrix</b></span></footer>
      </div>
    </main></div>
    {masterEditing && superAdmin && <MasterEditor kind={masterEditing.kind} row={masterEditing.row} isNew={masterEditing.isNew} goals={goals} records={masterEditing.kind === 'indicators' ? allIndicators : allInitiatives} onClose={() => setMasterEditing(null)} onSave={saveMaster}/>}
    {pendingDeleteGoal && superAdmin && <DeleteGoalDialog goal={pendingDeleteGoal} dependencies={getGoalDependencies(text(pendingDeleteGoal, 'Goal ID'))} lastGoal={goals.length <= 1} onClose={() => setPendingDeleteGoal(null)} onDelete={deleteGoal}/>}
    {notice && <div className="v25-toast" role="status"><Check size={18}/><span>{notice}</span><button className="v25-icon" aria-label="Dismiss notification" onClick={() => setNotice('')}>×</button></div>}
  </div>;
}
function Empty({title}: {title: string}) {return <div className="v25-empty"><Users size={26}/><h3>{title}</h3></div>}
