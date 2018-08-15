class MigrateLayoutToProfile < ActiveRecord::Migration
  def up
    execute "update profiles set data = coalesce(coalesce(data,'{}') || (select '{' || Chr(34) || 'layout' || Chr(34) || ':'  || to_json(layout) || '}'
    from users where id = user_id and type='Person')::jsonb,data)"
  end

  def down
    execute "update profiles set data = data::jsonb - 'layout'"
  end
end
