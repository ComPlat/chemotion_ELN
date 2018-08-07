class UserAsJson < ActiveRecord::Migration
  def self.up
    execute "CREATE OR REPLACE FUNCTION user_as_json(user_id integer)
     RETURNS json
     LANGUAGE sql
     AS $$
       select row_to_json(result) from (
      	 select users.id, users.name_abbreviation as initials ,users.type,users.first_name || chr(32) || users.last_name as name
     	   from users where id = $1
   	   ) as result
     $$"
  end
  def self.down
    execute "drop function user_as_json(int4)"
  end
end
