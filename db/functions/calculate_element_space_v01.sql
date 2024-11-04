CREATE OR REPLACE function calculate_element_space(el_id integer, el_type text)
returns bigint
language plpgsql
as $function$
declare
    used_space_attachments bigint default 0;
    used_space_datasets bigint default 0;
    used_space bigint default 0;
begin
    select sum((attachment_data->'metadata'->'size')::bigint) into used_space_attachments
    from attachments
    where attachable_type = el_type and attachable_id = el_id;
    used_space = COALESCE(used_space_attachments, 0);

    select sum(calculate_dataset_space(descendant_id)) into used_space_datasets
    from container_hierarchies where ancestor_id = (select id from containers where containable_id = el_id and containable_type = el_type);
    used_space = used_space + COALESCE(used_space_datasets, 0);

    return COALESCE(used_space, 0);
end;$function$;
