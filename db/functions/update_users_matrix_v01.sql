create or replace function update_users_matrix()
returns trigger as
$FUNC$
begin
	if (TG_OP='INSERT') then
    PERFORM generate_users_matrix(null);
	end if;

	if (TG_OP='UPDATE') then
	  if new.enabled <> old.enabled or new.deleted_at <> new.deleted_at then
      PERFORM generate_users_matrix(null);
	  elsif new.include_ids <> old.include_ids then
      PERFORM generate_users_matrix(new.include_ids || old.include_ids);
    elsif new.exclude_ids <> old.exclude_ids then
      PERFORM generate_users_matrix(new.exclude_ids || old.exclude_ids);
	  end if;
	end if;
  return new;
end
$FUNC$ language plpgsql;
