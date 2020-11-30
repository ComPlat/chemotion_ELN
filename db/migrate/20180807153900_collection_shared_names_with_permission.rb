class CollectionSharedNamesWithPermission < ActiveRecord::Migration[4.2]
  def change
    create_function :collection_shared_names
  end
end
