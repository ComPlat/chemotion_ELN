CREATE OR REPLACE FUNCTION user_ids(user_id integer)
  RETURNS TABLE(user_ids integer)
  LANGUAGE sql
  AS $$
    select $1 as id
    union
    (select users.id from users inner join users_groups ON users.id = users_groups.group_id WHERE users.deleted_at IS null
   and users.type in ('Group') and users_groups.user_id = $1)
  $$
