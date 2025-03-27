# frozen_string_literal: true

class AddLogidzeToChemicals < ActiveRecord::Migration[6.1]
  def change
      add_column :chemicals, :updated_at, :datetime
      add_column :chemicals, :log_data, :jsonb

      reversible do |dir|
        dir.up do
          execute <<~SQL.squish
            SELECT logidze_create_trigger_on_table('chemicals', 'logidze_on_chemicals', 'updated_at');
          SQL

          execute <<~SQL.squish
            UPDATE chemicals as t
            SET log_data = logidze_snapshot(to_jsonb(t), 'updated_at');
          SQL
        end

        dir.down do
          execute "DROP TRIGGER IF EXISTS logidze_on_chemicals on chemicals;"
        end
      end

  end
end
