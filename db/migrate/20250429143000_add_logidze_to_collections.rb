# frozen_string_literal: true

class AddLogidzeToCollections < ActiveRecord::Migration[6.1]
  def change
      add_column :collections, :log_data, :jsonb

      reversible do |dir|
        dir.up do
          execute <<~SQL.squish
            SELECT logidze_create_trigger_on_table('collections', 'logidze_on_collections', 'updated_at');
          SQL

          execute <<~SQL.squish
            UPDATE collections as t
            SET log_data = logidze_snapshot(to_jsonb(t), 'updated_at');
          SQL
        end

        dir.down do
          execute "DROP TRIGGER IF EXISTS logidze_on_collections on collections;"
        end
      end

  end
end
