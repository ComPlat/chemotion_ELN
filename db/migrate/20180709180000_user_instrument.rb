class UserInstrument < ActiveRecord::Migration
  def self.up
    execute "CREATE OR REPLACE FUNCTION user_instrument(user_id integer, sc text)
     RETURNS TABLE(instrument text)
     LANGUAGE sql
     AS $$
       select distinct extended_metadata -> 'instrument' as instrument from containers c
       where c.container_type='dataset' and c.id in
       (select ch.descendant_id from containers sc,container_hierarchies ch, samples s, users u
       where sc.containable_type in ('Sample','Reaction') and ch.ancestor_id=sc.id and sc.containable_id=s.id
       and s.created_by = u.id and u.id = $1 and ch.generations=3 group by descendant_id)
       and upper(extended_metadata -> 'instrument') like upper($2 || '%')
       order by extended_metadata -> 'instrument' limit 10
     $$"
  end
  def self.down
    execute "drop function user_instrument(int4,text)"
  end
end
