CREATE OR REPLACE FUNCTION public.group_user_ids(group_id integer)
 RETURNS TABLE(user_ids integer)
 LANGUAGE sql
AS $function$
       select id from users where type='Person' and id= $1
       union
       select user_id from users_groups where group_id = $1
$function$
