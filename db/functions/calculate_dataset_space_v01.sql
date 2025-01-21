CREATE OR REPLACE function calculate_dataset_space(cid integer)
returns bigint
language plpgsql
as $function$
declare
    used_space bigint default 0;
begin
    select sum((attachment_data->'metadata'->'size')::bigint) into used_space
    from attachments
    where attachable_type = 'Container' and attachable_id = cid
        and attachable_id in (select id from containers where container_type = 'dataset');
    return COALESCE(used_space,0);
end;$function$;
