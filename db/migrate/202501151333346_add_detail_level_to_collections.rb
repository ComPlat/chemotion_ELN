class AddDetailLevelToCollections < ActiveRecord::Migration[6.1]
  def change
    add_column :collections, :sequence_based_macromolecule_sample_detail_level, :integer, default: 10
    add_column :sync_collections_users, :sequence_based_macromolecule_sample_detail_level, :integer, default: 10
  end
end
