create or replace function detail_level_for_sample(in_user_id integer, in_sample_id integer)
returns table(detail_level_sample integer, detail_level_wellplate integer)
language plpgsql
as $function$
declare
  i_detail_level_wellplate integer default 0;
  i_detail_level_sample integer default 0;
begin
  select max(all_cols.sample_detail_level), max(all_cols.wellplate_detail_level)
  into i_detail_level_sample, i_detail_level_wellplate
  from
  (
    select v_sams_cols.cols_sample_detail_level sample_detail_level, v_sams_cols.cols_wellplate_detail_level wellplate_detail_level
      from v_samples_collections v_sams_cols
      where v_sams_cols.sams_id = in_sample_id
      and v_sams_cols.cols_user_id in (select user_ids(in_user_id))
    union
    select sync_cols.sample_detail_level sample_detail_level, sync_cols.wellplate_detail_level wellplate_detail_level
      from sync_collections_users sync_cols
      inner join collections cols on cols.id = sync_cols.collection_id and cols.deleted_at is null
      where sync_cols.collection_id in
      (
        select v_sams_cols.cols_id
        from v_samples_collections v_sams_cols
        where v_sams_cols.sams_id = in_sample_id
      )
      and sync_cols.user_id in (select user_ids(in_user_id))
  ) all_cols;

    return query select coalesce(i_detail_level_sample,0) detail_level_sample, coalesce(i_detail_level_wellplate,0) detail_level_wellplate;
end;$function$;
