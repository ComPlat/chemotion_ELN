class CollectionSharedNamesWithPermission < ActiveRecord::Migration
  def change
    create_function :collection_shared_names
  end
end
