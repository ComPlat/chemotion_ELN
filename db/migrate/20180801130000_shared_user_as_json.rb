class SharedUserAsJson < ActiveRecord::Migration
  def self.up
    execute "CREATE OR REPLACE FUNCTION shared_user_as_json(in_user_id integer, in_current_user_id integer)
     RETURNS json
     LANGUAGE plpgsql
     AS $$
       begin
       	if (in_user_id = in_current_user_id) then
       		return null;
       	else
       		return (select row_to_json(result) from (
       		select users.id, users.name_abbreviation as initials ,users.type,users.first_name || chr(32) || users.last_name as name
       		from users where id = $1
       		) as result);
       	end if;
        end;
     $$"
  end
  def self.down
    execute "drop function shared_user_as_json(int4,int4)"
  end
end
