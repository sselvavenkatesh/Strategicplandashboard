import type {Indicator} from './dashboard';

export function formatIndicatorVariance(k:Pick<Indicator,'variance'|'type'|'value'|'name'|'shortName'|'isPercent'>):string {
  if(k.variance==null)return '—';
  const value=k.variance;
  const currency=/currency|dollar|\$/.test(k.type.toLowerCase())||k.value.includes('$')||/fund balance/i.test(k.name+' '+k.shortName);
  if(currency){
    const amount=Math.abs(value);
    return (value<0?'-':'')+'$'+(amount>=1000000?(amount/1000000).toFixed(2)+'M':amount.toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1}));
  }
  return value.toFixed(1)+(k.isPercent?'%':'');
}
