import {useState} from 'react';
import {Check,ExternalLink,ArrowLeftRight,RotateCcw} from 'lucide-react';
import {appearanceKey,defaultAppearance,readAppearance,type Appearance} from '../../../lib/appearance';
export function AppearanceSettings({readOnly=false}:{readOnly?:boolean}){
 const [draft,setDraft]=useState<Appearance>(()=>readAppearance()??defaultAppearance),[notice,setNotice]=useState('');
 function change<K extends keyof Appearance>(key:K,value:Appearance[K]){setDraft(x=>({...x,[key]:value,...(key==='goals'?{principles:value==='right'?'bottom':'right'}:key==='principles'?{goals:value==='right'?'bottom':'right'}:{})} as Appearance));setNotice('')}
 function preview(){try{localStorage.setItem(appearanceKey,JSON.stringify(draft));setNotice('Preview updated.');window.open(import.meta.env.BASE_URL+'?appearance=custom','_blank','noopener')}catch{setNotice('Preview could not be opened. Check browser storage settings.')}}
 return <section className="v25-panel appearanceSettings"><div className="v25-panel-title"><h2>Welcome page appearance</h2><button className="v25-button" disabled={readOnly} onClick={()=>{setDraft(x=>({...x,goals:x.goals==='right'?'bottom':'right',principles:x.goals==='right'?'right':'bottom'}));setNotice('')}}><ArrowLeftRight size={14}/>Swap layout</button></div><div className="v25-form-grid">
 <label>Goals position<select disabled={readOnly} value={draft.goals} onChange={e=>change('goals',e.target.value as Appearance['goals'])}><option value="bottom">Below welcome</option><option value="right">Right · stacked</option></select></label>
 <label>Mission & Vision position<select disabled={readOnly} value={draft.principles} onChange={e=>change('principles',e.target.value as Appearance['principles'])}><option value="right">Right</option><option value="bottom">Bottom</option></select></label>
 <label>Statement order<select disabled={readOnly} value={draft.visionFirst?'vision':'mission'} onChange={e=>change('visionFirst',e.target.value==='vision')}><option value="mission">Mission, then Vision</option><option value="vision">Vision, then Mission</option></select></label>
</div>
 <div className="v25-panel-footer"><span className="appearanceNotice" role="status">{notice||'Preview settings apply in this browser.'}</span><button className="v25-button" disabled={readOnly} onClick={()=>{setDraft(defaultAppearance);localStorage.removeItem(appearanceKey);setNotice('Default appearance restored.')}}><RotateCcw size={14}/>Reset</button><button className="v25-button primary" disabled={readOnly} onClick={preview}><Check size={14}/>Apply & preview<ExternalLink size={12}/></button></div></section>
}
