from app import ai,repository
from app.ai_progress import progress_summary

def test_summary_counts_initiatives_separately_from_actions_and_keeps_unknown_statuses():
    goals=[{'Goal ID':'G1','Goal Name':'Excellence'},{'Goal ID':'G2','Goal Name':'Opportunity'}]
    rows=[{'goal_id':'G1','total':16,'completed':1,'in_progress':8,'not_started':5,'on_hold':1},
          {'goal_id':'G1','total':0,'completed':0,'in_progress':0,'not_started':0,'on_hold':0},
          {'goal_id':'G2','total':3,'completed':3,'in_progress':0,'not_started':0,'on_hold':0}]
    result=progress_summary(goals,rows)
    assert result['overall']['initiativeCount']==3 and result['overall']['total']==19
    assert result['overall']['completedInitiatives']==1 and result['overall']['other']==1
    assert result['goals'][0]['completionPercent']==6.3
    assert result['goals'][1]['completionPercent']==100.0
    assert progress_summary(goals,[])['overall']['completionPercent'] is None

def test_progress_counts_read_all_rows_and_apply_visibility_at_every_level():
    name,sql,scoped=next(q for q in repository.AI_CONTEXT_QUERIES if q[0]=='initiativeProgress')
    assert scoped and 'limit ' not in sql.lower()
    assert 'm."Role"=\'All\'' in sql and 'g."Role"=\'All\'' in sql and 'd."Role"=\'All\'' in sql
    assert sql.count('%s')==2 and 'count(d."Initiative ID")' in sql

def test_overview_uses_full_aggregates_without_dumping_action_details():
    original={'initiativeData':[{'Action Item':'Example'}],'initiativeProgress':[{'total':500}],
              'progressSummary':{'overall':{'total':500,'initiativeCount':3}}}
    overview=ai.model_context(original,'How are our strategic initiatives progressing?')
    assert 'initiativeData' not in overview and overview['progressSummary']['overall']['total']==500
    assert 'initiativeData' in original
    assert ai.model_context(original,'Show detailed initiative progress and action items') is original

def test_repeated_question_and_indentation_are_removed_but_paragraphs_survive():
    q='How are initiatives progressing?'
    answer=ai.clean_answer(q+'\n'+q+'\n\n    Overall progress\n\n    Actions are in progress.',q)
    assert answer=='Overall progress\n\nActions are in progress.'

def test_unexpected_model_table_keeps_column_meaning_and_plain_pipes_keep_text():
    answer=ai.clean_answer('| Goal | Completed |\n| --- | ---: |\n| Excellence | 3 of 10 |')
    assert answer=='Goal: Excellence; Completed: 3 of 10'
    assert ai.clean_answer('Progress | 30%')=='Progress ; 30%'

def test_guidance_requests_concise_prose_without_changing_the_model():
    assert '180-250 words' in ai.RESPONSE_GUIDANCE
    assert 'Never repeat' in ai.RESPONSE_GUIDANCE and 'Never use tables' in ai.RESPONSE_GUIDANCE
    assert 'progressSummary' in ai.RESPONSE_GUIDANCE
