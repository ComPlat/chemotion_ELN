class AddIsSynchronizedToCollections < ActiveRecord::Migration[4.2]
  def change
    add_column :collections, :is_synchronized, :boolean, null: false, default: false
    Collection.reset_column_information

    SyncCollectionsUser.find_each do |sc|
      sc.collection.update_attribute(:is_synchronized, true) if sc.collection.present?
    end
  end
end
