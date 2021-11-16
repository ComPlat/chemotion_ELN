CREATE OR REPLACE FUNCTION literatures_by_element(element_type text, element_id integer)
 RETURNS TABLE(literatures text)
 LANGUAGE sql
 AS $$
   select string_agg(l2.id::text, ',') as literatures from literals l , literatures l2 
   where l.literature_id = l2.id 
   and l.element_type = $1 and l.element_id = $2
 $$