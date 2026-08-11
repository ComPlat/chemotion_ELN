# frozen_string_literal: true

class AddLogidzeToCollectionShares < ActiveRecord::Migration[6.1]
  def change
    add_column :collection_shares, :log_data, :jsonb

    reversible do |dir|
      dir.up do
        execute <<~SQL.squish
          SELECT logidze_create_trigger_on_table('collection_shares', 'logidze_on_collection_shares', 'updated_at');
        SQL

        execute <<~SQL.squish
          UPDATE collection_shares as t
          SET log_data = logidze_snapshot(to_jsonb(t), 'updated_at');
        SQL
      end

      dir.down do
        execute 'DROP TRIGGER IF EXISTS logidze_on_collection_shares on collection_shares;'
      end
    end
  end
end
