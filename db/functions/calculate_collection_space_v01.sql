CREATE OR REPLACE function calculate_collection_space(collectionId integer)
returns bigint
language plpgsql
as $function$
declare
    used_space_samples bigint default 0;
    used_space_reactions bigint default 0;
    used_space_wellplates bigint default 0;
    used_space_screens bigint default 0;
    used_space_research_plans bigint default 0;
    used_space bigint default 0;
begin
    select sum(calculate_element_space(sample_id, 'Sample')) into used_space_samples
    from collections_samples
    where collection_id = collectionId;

    used_space = COALESCE(used_space_samples,0);
    
    select sum(calculate_element_space(reaction_id, 'Reaction')) into used_space_reactions
    from collections_reactions
    where collection_id = collectionId;

    used_space = used_space + COALESCE(used_space_reactions,0);

    select sum(calculate_element_space(wellplate_id, 'Wellplate')) into used_space_wellplates
    from collections_wellplates
    where collection_id = collectionId;

    used_space = used_space + COALESCE(used_space_wellplates,0);

    select sum(calculate_element_space(screen_id, 'Screen')) into used_space_screens
    from collections_screens
    where collection_id = collectionId;

    used_space = used_space + COALESCE(used_space_screens,0);

    select sum(calculate_element_space(research_plan_id, 'ResearchPlan')) into used_space_research_plans
    from collections_research_plans
    where collection_id = collectionId;

    used_space = used_space + COALESCE(used_space_research_plans,0);

    return COALESCE(used_space,0);
end;$function$;
