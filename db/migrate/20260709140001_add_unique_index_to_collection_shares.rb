# frozen_string_literal: true

class AddUniqueIndexToCollectionShares < ActiveRecord::Migration[6.1]
  def up
    add_index :collection_shares, %i[collection_id shared_with_id],
              unique: true, name: 'index_collection_shares_on_collection_id_and_shared_with_id'
  end

  def down
    remove_index :collection_shares, name: 'index_collection_shares_on_collection_id_and_shared_with_id'
  end
end
