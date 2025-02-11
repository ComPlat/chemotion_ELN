CREATE OR REPLACE function calculate_collection_space(collectionId integer)
returns bigint
language plpgsql
as $function$
declare
    used_space bigint default 0;
    element_types text[] := array['Sample', 'Reaction', 'Wellplate', 'Screen', 'ResearchPlan'];
    element_table text;
    element_space bigint;
begin
    foreach element_table in array element_types loop
        execute format('select sum(calculate_element_space(id, $1)) from collections_%s where collection_id = $2', lower(element_table))
        into element_space
        using element_table, collectionId;
        used_space := used_space + coalesce(element_space, 0);
    end loop;
    return coalesce(used_space, 0);
end;
$function$;