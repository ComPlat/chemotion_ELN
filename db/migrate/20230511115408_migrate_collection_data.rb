class MigrateCollectionData < ActiveRecord::Migration[6.1]
  def change
    collections = Collection.where(is_synchronized: true, is_shared: false, shared_by_id: nil, is_locked: false) # share whole collection
    return if collections.nil?
    collections.each do |c|
      sync_collections_users = SyncCollectionsUser.where(collection_id: c.id)
      sync_collections_users.each do |scu|
        CollectionAcl.create(
          user_id: scu.user_id,
          collection_id: scu.collection_id,
          label: scu.label,
          permission_level: scu.permission_level, sample_detail_level: scu.sample_detail_level,
          reaction_detail_level: scu.reaction_detail_level, wellplate_detail_level: scu.wellplate_detail_level,
          screen_detail_level: scu.screen_detail_level, researchplan_detail_level: scu.researchplan_detail_level,
          element_detail_level: scu.element_detail_level,
          created_at: scu.created_at, updated_at: scu.updated_at
        )
      end
    end
    collections.update(is_synchronized: false)

    collections = Collection.where(is_synchronized: false, is_shared: true, is_locked: false).where.not(shared_by_id: nil) #My Shared Collections + Shared with me
    return if collections.nil?
    collections.each do |col|
      CollectionAcl.create(
        user_id: col.user_id, collection_id: col.id, label: col.label,
        permission_level: col.permission_level, sample_detail_level: col.sample_detail_level,
        reaction_detail_level: col.reaction_detail_level, wellplate_detail_level: col.wellplate_detail_level,
        screen_detail_level: col.screen_detail_level, researchplan_detail_level: col.researchplan_detail_level,
        element_detail_level: col.element_detail_level, created_at: col.created_at, updated_at: col.updated_at
      )
      shared_by_id = col.shared_by_id
      col.update(user_id: shared_by_id, shared_by_id: nil)
    end
  end
end
