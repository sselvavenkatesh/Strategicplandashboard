import {useEffect, useMemo, useState} from 'react';
import {Link, useLocation, useSearchParams} from 'react-router-dom';
import {ArrowLeft, ArrowRight, BarChart3, Building2, Check, ChevronRight, ClipboardList, Eye, FlaskConical, Goal, Home, Moon, Pencil, RotateCcw, Search, Settings2, ShieldCheck, Sun, Users} from 'lucide-react';
import {useTheme} from '../../../app/ThemeProvider';
import {accessibleRows, emptyAssignments, idColumn, loadDataset, stakeholders, text} from './model';
import type {Assignments, DataRow, Dataset, Kind} from './model';
import {StakeholderSelect} from './StakeholderSelect';
import {DataEditor} from './DataEditor';
import './v25.css';

type Section = 'home' | 'plan' | 'indicators' | 'initiatives';
const menus = [{id: 'home', label: 'Overview', icon: Home}, {id: 'plan', label: 'Strategic Plan Configuration', icon: Settings2}, {id: 'indicators', label: 'Indicator Configuration', icon: BarChart3}, {id: 'initiatives', label: 'Initiative Configuration', icon: ClipboardList}] as const;
const draftKey = 'strategic-v25-ui-draft-v1';
type Draft = {assignments: Assignments; indicatorEdits: Record<string, DataRow>; initiativeEdits: Record<string, DataRow>; profile?: DataRow; goals?: DataRow[]};
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
  const [masterSearch, setMasterSearch] = useState('');
  const [goalFilter, setGoalFilter] = useState('');
  const [masterPage, setMasterPage] = useState(1);
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
  const indicators = useMemo(() => dataset ? superAdmin ? dataset.indicators : accessibleRows(dataset.indicators, 'indicators', user, assignments) : [], [dataset, superAdmin, user, assignments]);
  const initiatives = useMemo(() => dataset ? superAdmin ? dataset.initiatives : accessibleRows(dataset.initiatives, 'initiatives', user, assignments) : [], [dataset, superAdmin, user, assignments]);
  const kind = section === 'initiatives' ? 'initiatives' : 'indicators';
  const master = kind === 'indicators' ? indicators : initiatives;
  const sourceData = kind === 'indicators' ? dataset?.indicatorData ?? [] : dataset?.initiativeData ?? [];
  const edits = kind === 'indicators' ? draft.indicatorEdits : draft.initiativeEdits;
  const allowedIds = new Set(master.map(row => text(row, idColumn(kind))));
  const indexedData = sourceData.map((row, index) => ({row: edits[text(row, '__previewKey')] ?? row, index})).filter(({row}) => allowedIds.has(text(row, idColumn(kind))));
  const filteredMaster = master.filter(row => (!goalFilter || row['Goal ID'] === goalFilter) && Object.values(row).join(' ').toLowerCase().includes(masterSearch.toLowerCase()));
  const goalName = (id: string) => goals.find(goal => goal['Goal ID'] === id)?.['Goal Name'] ?? id;
  const navigateSection = (next: Section) => {setParams(next === 'home' ? {} : {section: next}); setMasterSearch(''); setGoalFilter(''); setMasterPage(1)};
  const selectTab = (tab: string) => setParams({section, tab});
  function assign(kind: Kind, id: string, value: string[]) {setDraft(previous => ({...previous, assignments: {...previous.assignments, [kind]: {...previous.assignments[kind], [id]: value}}}))}
  function updateProfile(field: string, value: string) {setDraft(previous => ({...previous, profile: {...(previous.profile ?? dataset?.profile), [field]: value}}))}
  function updateGoal(index: number, field: string, value: string) {setDraft(previous => ({...previous, goals: (previous.goals ?? dataset?.goals ?? []).map((row, i) => i === index ? {...row, [field]: value} : row)}))}
  function exampleAssignments() {
    setDraft(previous => ({...previous, assignments: {goals: {G1: ['6', '7'], G2: ['8'], G3: ['9'], G4: ['10']}, indicators: {ID1: ['6']}, initiatives: {IN1: ['6']}}}));
    setNotice('Example assignments loaded in this tab. John has explicit access; Sarah inherits Goal 1 access.');
  }
  function accessMode(resource: 'indicators' | 'initiatives') {return Object.values(assignments[resource]).some(users => users.includes(user)) ? 'Explicit assignment' : 'Inherited from assigned goals'}
  const masterPages = Math.max(1, Math.ceil(filteredMaster.length / 5));
  const currentMasterPage = Math.min(masterPage, masterPages);
  const pagedMaster = filteredMaster.slice((currentMasterPage - 1) * 5, currentMasterPage * 5);
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
        <div className="v25-section-tabs" role="group" aria-label="Strategic Plan sections"><button aria-pressed={planTab === 'district'} onClick={() => selectTab('district')}>District & Strategic Plan</button><button aria-pressed={planTab === 'goals'} onClick={() => selectTab('goals')}>{superAdmin ? 'Goal Master' : 'Assigned Goals'} <span>{visibleGoals.length}</span></button></div>
        {planTab === 'district' && <section className="v25-panel"><div className="v25-panel-title"><div><h2>District & Strategic Plan</h2></div>{!superAdmin && <span className="v25-badge"><Eye size={14}/> View only</span>}</div>
          <div className="v25-form-grid">{['School District Name', 'Strategic Plan Name', 'Strategic Plan Duration', 'Admin Signin Method', 'Mission Statement', 'Vision Statement'].map(field => <label key={field} className="">{field}{field.endsWith('Statement') ? <textarea readOnly={!superAdmin} value={text(profile, field)} onChange={event => updateProfile(field, event.target.value)}/> : field === 'Admin Signin Method' && superAdmin ? <select value={text(profile, field)} onChange={event => updateProfile(field, event.target.value)}>{['Userbased', 'Google', 'Microsoft'].map(method => <option key={method}>{method}</option>)}</select> : <input readOnly={!superAdmin} value={text(profile, field)} onChange={event => updateProfile(field, event.target.value)}/>}</label>)}</div>
          {superAdmin && <div className="v25-panel-footer"><button className="v25-button primary v25-save" onClick={() => setNotice('Saved locally.')}><Check size={14}/> Save</button></div>}
        </section>}
        {planTab === 'goals' && <section className="v25-panel"><div className="v25-panel-title"><div><h2>{superAdmin ? 'Goal Master' : 'Assigned Goals'} <span className="v25-count">{visibleGoals.length}</span></h2></div>{superAdmin ? <span className="v25-badge"><Users size={14}/> Multiple stakeholders</span> : <span className="v25-badge"><Eye size={14}/> View only</span>}</div>
          <div className="v25-goal-grid">{visibleGoals.map(goal => {const index = goals.indexOf(goal); const id = text(goal, 'Goal ID'); return <article className="v25-goal-card" key={id}><div className="v25-goal-card-head"><span className="v25-goal-number">{id}</span><span>{dataset.indicators.filter(row => row['Goal ID'] === id).length} indicators · {dataset.initiatives.filter(row => row['Goal ID'] === id).length} initiatives</span></div>{superAdmin ? <><label>Goal Name<input value={text(goal, 'Goal Name')} onChange={event => updateGoal(index, 'Goal Name', event.target.value)}/></label><label>Goal Description<textarea value={text(goal, 'Goal Description')} onChange={event => updateGoal(index, 'Goal Description', event.target.value)}/></label><div className="v25-stakeholder-field"><span>Stakeholder</span><StakeholderSelect label={`Stakeholder for ${text(goal, 'Goal Name')}`} value={assignments.goals[id] ?? []} onChange={value => assign('goals', id, value)}/></div></> : <><h3>{text(goal, 'Goal Name')}</h3><p>{text(goal, 'Goal Description')}</p><span className="v25-badge"><Check size={13}/> Assigned to you</span></>}</article>})}</div>
          {!visibleGoals.length && <Empty title="No goals assigned yet"/>}
          {superAdmin && <div className="v25-panel-footer"><button className="v25-button primary v25-save" onClick={() => setNotice('Saved locally.')}><Check size={15}/> Save</button></div>}
        </section>}
      </>}
      {(section === 'indicators' || section === 'initiatives') && <>
        <div className="v25-section-tabs" role="group" aria-label="Configuration sections"><button aria-pressed={resourceTab === 'master'} onClick={() => selectTab('master')}>{superAdmin ? kind === 'indicators' ? 'Indicator Master' : 'Initiative Master' : kind === 'indicators' ? 'Assigned Indicators' : 'Assigned Initiatives'} <span>{master.length}</span></button><button aria-pressed={resourceTab === 'data'} onClick={() => selectTab('data')}>{kind === 'indicators' ? 'Indicator Data' : 'Initiative Data'} <span>{indexedData.length}</span></button></div>
        {resourceTab === 'master' && <section className="v25-panel"><div className="v25-panel-title"><div><h2>{superAdmin ? kind === 'indicators' ? 'Indicator Master' : 'Initiative Master' : kind === 'indicators' ? 'Assigned Indicators' : 'Assigned Initiatives'} <span className="v25-count">{master.length}</span></h2></div><span className="v25-badge">{superAdmin ? 'Master configuration' : accessMode(kind)}</span></div>
          <div className="v25-table-tools"><label className="v25-search"><Search size={16}/><input aria-label="Search master" placeholder={`Search ${kind}…`} value={masterSearch} onChange={event => {setMasterSearch(event.target.value); setMasterPage(1)}}/></label><select aria-label="Filter by goal" value={goalFilter} onChange={event => {setGoalFilter(event.target.value); setMasterPage(1)}}><option value="">All goals</option>{goals.map(goal => <option key={text(goal, 'Goal ID')} value={text(goal, 'Goal ID')}>{text(goal, 'Goal Name')}</option>)}</select></div>
          {master.length ? <div className="v25-table-scroll v25-master-scroll"><table className="v25-table v25-master-table"><thead><tr><th>{kind === 'indicators' ? 'Indicator' : 'Initiative'}</th><th>Goal</th><th>{kind === 'indicators' ? 'Type / Direction' : 'Sub-initiatives'}</th><th>{superAdmin ? 'Stakeholder' : 'Access'}</th></tr></thead><tbody>{pagedMaster.map(row => {const id = text(row, idColumn(kind)); return <tr key={id}><td><b>{text(row, kind === 'indicators' ? 'Indicator Name' : 'Initiative Name')}</b><small>{id}</small></td><td>{goalName(text(row, 'Goal ID'))}</td><td>{kind === 'indicators' ? <><span>{text(row, 'Indicator Type') || '—'}</span><small>{text(row, 'KPI Nature')}</small></> : text(row, 'Total Sub Initiatives')}</td><td>{superAdmin ? <StakeholderSelect label={`Stakeholder for ${text(row, kind === 'indicators' ? 'Indicator Name' : 'Initiative Name')}`} value={assignments[kind][id] ?? []} onChange={value => assign(kind, id, value)}/> : <span className="v25-badge editable"><Pencil size={12}/> Can edit</span>}</td></tr>})}</tbody></table>{!filteredMaster.length && <Empty title="No matching items"/>}</div> : <Empty title={`No ${kind} assigned yet`}/>}
          <div className="v25-master-footer">{superAdmin && <button className="v25-button primary v25-save" onClick={() => setNotice('Saved locally.')}><Check size={14}/> Save</button>}<div className="v25-pagination"><span>{filteredMaster.length ? (currentMasterPage - 1) * 5 + 1 : 0}–{Math.min(currentMasterPage * 5, filteredMaster.length)} of {filteredMaster.length}</span><div><button disabled={currentMasterPage === 1} onClick={() => setMasterPage(currentMasterPage - 1)}>Previous</button><span>{currentMasterPage} / {masterPages}</span><button disabled={currentMasterPage === masterPages} onClick={() => setMasterPage(currentMasterPage + 1)}>Next</button></div></div></div>
        </section>}
        {resourceTab === 'data' && <section className="v25-panel"><div className="v25-panel-title"><div><h2>{kind === 'indicators' ? 'Indicator' : 'Initiative'} Data <span className="v25-count">{indexedData.length}</span></h2></div></div>
          {indexedData.length ? <DataEditor key={`${kind}-${user}-${superAdmin}`} kind={kind} rows={indexedData.map(item => item.row)} onSave={(index, row) => {const rowKey = text(sourceData[indexedData[index].index], '__previewKey'); setDraft(previous => ({...previous, [kind === 'indicators' ? 'indicatorEdits' : 'initiativeEdits']: {...(kind === 'indicators' ? previous.indicatorEdits : previous.initiativeEdits), [rowKey]: row}})); setNotice('Saved locally.')}}/> : <Empty title="No reporting data in your scope"/>}
        </section>}
      </>}
      </>}
      <footer className="v25-footer"><span>Strategic Plan · V2.5</span><span>Powered by <b>K12Matrix</b></span></footer>
      </div>
    </main></div>
    {notice && <div className="v25-toast" role="status"><Check size={18}/><span>{notice}</span><button className="v25-icon" aria-label="Dismiss notification" onClick={() => setNotice('')}>×</button></div>}
  </div>;
}
function Empty({title}: {title: string}) {return <div className="v25-empty"><Users size={26}/><h3>{title}</h3></div>}
