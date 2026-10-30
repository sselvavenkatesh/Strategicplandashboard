import type {CSSProperties} from 'react';
import {useNavigate} from 'react-router-dom';
import {ArrowUpRight,Compass,Flag,Target} from 'lucide-react';
import type {DistrictProfile,Goal} from '../../lib/dashboard';
import type {Appearance} from '../../lib/appearance';
import './appearanceWelcome.css';
export function AppearanceWelcome({profile:x,goals,appearance:a}:{profile:DistrictProfile;goals:Goal[];appearance:Appearance}){
 const navigate=useNavigate();const wallpaper=a.wallpaper==='existing'?x.planImage:import.meta.env.BASE_URL+'wallpapers/'+a.wallpaper+'.svg';
 const areas=a.goals==='right'?'"intro goals" "principles principles"':'"intro principles" "goals goals"';
 const style={gridTemplateAreas:areas,'--welcome-brand':a.brand,'--goal-accent':a.goalColor,'--mission-accent':a.missionColor,'--vision-accent':a.visionColor,...(wallpaper?{backgroundImage:`linear-gradient(110deg,rgba(4,20,18,.95),rgba(4,20,18,.7)),url("${wallpaper}")`}:{})} as CSSProperties;
 return <main className={`welcome uxWelcome appearanceWelcome goals-${a.goals} principles-${a.principles}`} style={style}><section className="appearanceIntro welcomeCopy" style={{gridArea:'intro'}}><small>STRATEGIC PLAN {x.duration}</small><h1>Welcome to {x.districtName} <span>Strategic Plan Dashboard</span></h1><h2>Driving a Brighter Future Together</h2><p>{x.subText}</p><button className="primaryBtn" onClick={()=>navigate('/summary')}>Explore Strategic Plan →</button></section>
 <section style={{gridArea:'goals'}} className="appearanceGoals" aria-label="Strategic goals"><div className="appearanceSectionLabel"><Compass size={15}/>OUR STRATEGIC GOALS</div>{goals.map((goal,i)=><button key={goal.id} onClick={()=>navigate('/summary')} title={goal.description}><span className="appearanceGoalNumber">{String(i+1).padStart(2,'0')}</span><div><b>{goal.name}</b><p>{goal.description}</p></div><ArrowUpRight size={17}/></button>)}</section>
 <section className="appearancePrinciples" style={{gridArea:'principles',gridTemplateColumns:a.principles==='bottom'?'1.2fr 1fr':'1fr'}}><article className="appearanceMission" style={{order:a.visionFirst?1:0}}><Flag size={22}/><div><h2>Mission Statement</h2>{x.mission.split(/\n+/).filter(Boolean).map((text,i)=><p key={i}>{text}</p>)}</div></article><article className="appearanceVision" style={{order:a.visionFirst?0:1}}><Target size={22}/><div><h2>Vision Statement</h2><p>{x.vision}</p></div></article></section></main>
}
