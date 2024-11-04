CREATE OR REPLACE function calculate_used_space(userId integer)
returns bigint
language plpgsql
as $function$
declare
    used_space_samples bigint default 0;
    used_space_reactions bigint default 0;
    used_space_wellplates bigint default 0;
    used_space_screens bigint default 0;
    used_space_research_plans bigint default 0;
    used_space_reports bigint default 0;
    used_space_inbox bigint default 0;
    used_space bigint default 0;
begin
    select sum(calculate_element_space(s.sample_id, 'Sample')) into used_space_samples from (
        select distinct sample_id
        from collections_samples
        where collection_id in (select id from collections where user_id = userId)
    ) s;
    used_space = COALESCE(used_space_samples,0);
    
    select sum(calculate_element_space(r.reaction_id, 'Reaction')) into used_space_reactions from (
        select distinct reaction_id
        from collections_reactions
        where collection_id in (select id from collections where user_id = userId)
    ) r;
    used_space = used_space + COALESCE(used_space_reactions,0);

    select sum(calculate_element_space(wp.wellplate_id, 'Wellplate')) into used_space_wellplates from (
        select distinct wellplate_id
        from collections_wellplates
        where collection_id in (select id from collections where user_id = userId)
    ) wp;
    used_space = used_space + COALESCE(used_space_wellplates,0);

    select sum(calculate_element_space(wp.screen_id, 'Screen')) into used_space_screens from (
        select distinct screen_id
        from collections_screens
        where collection_id in (select id from collections where user_id = userId)
    ) wp;
    used_space = used_space + COALESCE(used_space_screens,0);

    select sum(calculate_element_space(rp.research_plan_id, 'ResearchPlan')) into used_space_research_plans from (
        select distinct research_plan_id
        from collections_research_plans
        where collection_id in (select id from collections where user_id = userId)
    ) rp;
    used_space = used_space + COALESCE(used_space_research_plans,0);

    select sum(calculate_element_space(id, 'Report')) into used_space_reports
    from reports
    where author_id = userId;
    used_space = used_space + COALESCE(used_space_reports,0);

    select sum((attachment_data->'metadata'->'size')::bigint) into used_space_inbox
    from attachments
    where attachable_type = 'Container'
        and attachable_id is null and created_for = userId;
        -- attachable_id is missing (why?), if this is a bug (and was fixed) change statement to
        -- and attachable_id = (select id from containers where containable_type='User' and containable_id=UserID);
    used_space = used_space + COALESCE(used_space_inbox,0);

    return COALESCE(used_space,0);
end;$function$;
