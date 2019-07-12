create or replace function generate_notifications(in_channel_id int4, in_message_id int4, in_user_id int4, in_user_ids int4[])
returns integer
language plpgsql
as $function$
declare
  i_channel_type int4;
  a_userids int4[];
  u int4;
begin
	select channel_type into i_channel_type
	from channels where id = in_channel_id;

  case i_channel_type
	when 9 then
	  insert into notifications (message_id, user_id, created_at,updated_at)
	  (select in_message_id, id, now(),now() from users where deleted_at is null and type='Person');
	when 5,8 then
	  if (in_user_ids is not null) then
	  a_userids = in_user_ids;
	  end if;
	  FOREACH u IN ARRAY a_userids
	  loop
		  insert into notifications (message_id, user_id, created_at,updated_at)
		  (select distinct in_message_id, id, now(),now() from users where type='Person' and id in (select group_user_ids(u))
		   and not exists (select id from notifications where message_id = in_message_id and user_id = users.id));
 	  end loop;
	end case;
	return in_message_id;
end;$function$;
