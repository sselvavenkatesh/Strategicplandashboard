import {Component, type ReactNode} from 'react';

export class DashboardErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){
    if(this.state.failed)return <main role="alert" style={{padding:32,fontFamily:'system-ui',color:'#dce9f5',background:'#081725',minHeight:'100vh'}}>
      <h1 style={{fontSize:22}}>The dashboard could not be displayed</h1>
      <p>Please reload the page to try again.</p>
      <button type="button" onClick={()=>window.location.reload()} style={{padding:'10px 18px',border:0,borderRadius:8,background:'#087ff5',color:'#fff',cursor:'pointer'}}>Reload dashboard</button>
    </main>;
    return this.props.children;
  }
}
