class CollectionSharedNames < ActiveRecord::Migration
  def self.up
    execute "CREATE OR REPLACE FUNCTION collection_shared_names(user_id integer, collection_id integer)
     RETURNS json
     LANGUAGE sql
     AS $$
     select array_to_json(array_agg(row_to_json(result))) from (
     SELECT sync_collections_users.id, users.type,users.first_name || chr(32) || users.last_name as name,sync_collections_users.permission_level,
     sync_collections_users.reaction_detail_level,sync_collections_users.sample_detail_level,sync_collections_users.screen_detail_level,sync_collections_users.wellplate_detail_level
     FROM sync_collections_users
     INNER JOIN users ON users.id = sync_collections_users.user_id AND users.deleted_at IS NULL
     WHERE sync_collections_users.shared_by_id = $1 and sync_collections_users.collection_id = $2
     group by  sync_collections_users.id,users.type,users.name_abbreviation,users.first_name,users.last_name,sync_collections_users.permission_level
     ) as result
     $$"
  end
  def self.down
    execute "drop function collection_shared_names(int4,int4)"
  end
end
