CREATE OR REPLACE FUNCTION labels_by_user_sample(user_id integer, sample_id integer)
 RETURNS TABLE(labels text)
 LANGUAGE sql
 AS $$
   select string_agg(title::text, ', ') as labels from (select title from user_labels ul where ul.id in (
     select d.list
     from element_tags et, lateral (
       select value::integer as list
       from jsonb_array_elements_text(et.taggable_data  -> 'user_labels')
     ) d
     where et.taggable_id = $2 and et.taggable_type = 'Sample'
   ) and (ul.access_level = 1 or (ul.access_level = 0 and ul.user_id = $1)) order by title  ) uls
 $$