# frozen_string_literal: true

class AddLogidzeToLiteratures < ActiveRecord::Migration[6.1]
  def change
      add_column :literatures, :log_data, :jsonb

      reversible do |dir|
        dir.up do
          execute <<~SQL.squish
            SELECT logidze_create_trigger_on_table('literatures', 'logidze_on_literatures', 'updated_at');
          SQL

          execute <<~SQL.squish
            UPDATE literatures as t
            SET log_data = logidze_snapshot(to_jsonb(t), 'updated_at');
          SQL
        end

        dir.down do
          execute "DROP TRIGGER IF EXISTS logidze_on_literatures on literatures;"
        end
      end

  end
end
