create or replace function generate_users_matrix(in_user_ids int4[])
returns boolean as
$FUNC$
begin
	if in_user_ids is null then
    update users u set matrix = (
	    select coalesce(sum(2^mx.id),0) from (
		    select distinct m1.* from matrices m1, users u1, users_groups ug1
		      where u.id = u1.id and ((m1.enabled = true) or ((u1.id = any(m1.include_ids)) or (u1.id = ug1.user_id and ug1.group_id = any(m1.include_ids))))
	      except
		    select distinct m2.* from matrices m2, users u2, users_groups ug2
		      where u.id = u2.id and ((u2.id = any(m2.exclude_ids)) or (u2.id = ug2.user_id and ug2.group_id = any(m2.exclude_ids)))
	    ) mx
    );
	else
		  update users u set matrix = (
		  	select coalesce(sum(2^mx.id),0) from (
			   select distinct m1.* from matrices m1, users u1, users_groups ug1
			     where u.id = u1.id and ((m1.enabled = true) or ((u1.id = any(m1.include_ids)) or (u1.id = ug1.user_id and ug1.group_id = any(m1.include_ids))))
			   except
			   select distinct m2.* from matrices m2, users u2, users_groups ug2
			     where u.id = u2.id and ((u2.id = any(m2.exclude_ids)) or (u2.id = ug2.user_id and ug2.group_id = any(m2.exclude_ids)))
			  ) mx
		  ) where ((in_user_ids) @> array[u.id]) or (u.id in (select ug3.user_id from users_groups ug3 where (in_user_ids) @> array[ug3.group_id]));
	end if;
  return true;
end
$FUNC$ language plpgsql;
