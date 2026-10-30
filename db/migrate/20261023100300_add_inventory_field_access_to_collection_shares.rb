# frozen_string_literal: true

class AddInventoryFieldAccessToCollectionShares < ActiveRecord::Migration[6.1]
  def change
    # Field group => 'hidden' | 'read' | 'edit'; NULL follows the default of the share's permission level.
    add_column :collection_shares, :inventory_field_access, :jsonb
    add_column :collection_shares, :log_data, :jsonb
  end
end
