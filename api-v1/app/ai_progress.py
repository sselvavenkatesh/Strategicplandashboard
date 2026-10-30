"""Summaries use visibility-filtered full aggregates, never truncated detail rows."""
from decimal import Decimal, ROUND_HALF_UP

def progress_summary(goals, initiatives):
    def totals(rows):
        result={key:sum(int(row.get(key) or 0) for row in rows) for key in ('total','completed','in_progress','not_started','on_hold')}
        result['other']=result['total']-sum(result[key] for key in ('completed','in_progress','not_started','on_hold'))
        result['completionPercent']=float((Decimal(100)*result['completed']/result['total']).quantize(Decimal('0.1'),rounding=ROUND_HALF_UP)) if result['total'] else None
        result['initiativeCount']=len(rows)
        result['completedInitiatives']=sum(int(row.get('total') or 0)>0 and int(row.get('total') or 0)==int(row.get('completed') or 0) for row in rows)
        return result
    return {'overall':totals(initiatives),'goals':[{'name':goal['Goal Name'],**totals([row for row in initiatives if row['goal_id']==goal['Goal ID']])} for goal in goals]}
