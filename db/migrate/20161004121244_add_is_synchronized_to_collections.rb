class AddIsSynchronizedToCollections < ActiveRecord::Migration[4.2]
  # SyncCollectionsUser was deleted, but the data migration still needs the model class, so we define it here
  # to be able to use its ActiveRecord interface
  if !defined?(SyncCollectionsUser)
      class SyncCollectionsUser < ApplicationRecord
        belongs_to :collection
      end
  end
  def change
    add_column :collections, :is_synchronized, :boolean, null: false, default: false
    Collection.reset_column_information

    SyncCollectionsUser.find_each do |sc|
      sc.collection.update_attribute(:is_synchronized, true) if sc.collection.present?
    end
  end
end
