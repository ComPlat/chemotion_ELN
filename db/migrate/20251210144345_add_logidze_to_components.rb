# frozen_string_literal: true

class AddLogidzeToComponents < ActiveRecord::Migration[6.1]
  def change
    add_column :components, :deleted_at, :datetime
    add_column :components, :log_data, :jsonb

    reversible do |dir|
      dir.up do
        execute <<~SQL.squish
          SELECT logidze_create_trigger_on_table('components', 'logidze_on_components', 'updated_at');
        SQL

        execute <<~SQL.squish
          UPDATE components as t
          SET log_data = logidze_snapshot(to_jsonb(t), 'updated_at');
        SQL
      end

      dir.down do
        execute 'DROP TRIGGER IF EXISTS logidze_on_components on components;'
      end
    end
  end
end
