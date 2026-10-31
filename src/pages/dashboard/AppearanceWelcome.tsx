import type {CSSProperties} from 'react';
import {useNavigate} from 'react-router-dom';
import {Compass} from 'lucide-react';
import type {DistrictProfile,Goal} from '../../lib/dashboard';
import type {Appearance} from '../../lib/appearance';
import './appearanceWelcome.css';
export function AppearanceWelcome({profile:x,goals,appearance:a}:{profile:DistrictProfile;goals:Goal[];appearance:Appearance}){
 const navigate=useNavigate();const wallpaper=a.wallpaper==='existing'?x.planImage:import.meta.env.BASE_URL+'wallpapers/'+a.wallpaper+'.svg';
 const areas=a.goals==='right'?'"intro goals" "principles principles"':'"intro principles" "goals goals"';
 const style={gridTemplateAreas:areas,...(wallpaper?{backgroundImage:`${x.districtId==='allen-park'?'linear-gradient(90deg,rgba(4,24,17,.93) 0%,rgba(5,30,22,.78) 52%,rgba(5,25,19,.48) 100%)':'linear-gradient(90deg,#06111ef7 0%,#06111eb7 55%,#06111e70)'},url("${wallpaper}")`}:{})} as CSSProperties;
 return <main className={`welcome uxWelcome appearanceWelcome goals-${a.goals} principles-${a.principles}`} style={style}><section className="appearanceIntro welcomeCopy" style={{gridArea:'intro'}}><small>STRATEGIC PLAN {x.duration}</small><h1>Welcome to {x.districtName} <span>Strategic Plan Dashboard</span></h1><h2>Driving a Brighter Future Together</h2><p>{x.subText}</p><button className="primaryBtn" onClick={()=>navigate('/summary')}>Explore Strategic Plan →</button></section>
 <section style={{gridArea:'goals'}} className="appearanceGoals" aria-label="Strategic goals"><div className="appearanceSectionLabel"><Compass size={15}/>OUR STRATEGIC GOALS</div>{goals.map((goal,i)=><button className="welcomeGoal" key={goal.id} aria-label={`${goal.name}: ${goal.description}`} onClick={()=>navigate('/summary')} title={goal.description}><span className="goalIcon" aria-hidden="true">{['★','◆','♥','✦','●','▲','⬟','✚'][i%8]}</span><div><b>{goal.name}</b><p>{goal.description}</p></div></button>)}</section>
 <section className="appearancePrinciples principles" style={{gridArea:'principles',gridTemplateColumns:a.principles==='bottom'?'1.2fr 1fr':'1fr'}}><article className="appearanceMission" style={{order:a.visionFirst?1:0}}><i aria-hidden="true">◎</i><div><b>Mission Statement</b>{x.mission.split(/\n+/).filter(Boolean).map((text,i)=><p key={i}>{text}</p>)}</div></article><article className="appearanceVision" style={{order:a.visionFirst?0:1}}><i aria-hidden="true">◉</i><div><b>Vision Statement</b><p>{x.vision}</p></div></article></section></main>
}
