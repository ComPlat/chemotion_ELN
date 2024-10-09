# frozen_string_literal: true

class AddLogidzeToWellplates < ActiveRecord::Migration[6.1]
  def change
    add_column :wellplates, :log_data, :jsonb

    reversible do |dir|
      dir.up do
        create_trigger :logidze_on_wellplates, on: :wellplates
      end

      dir.down do
        execute <<~SQL.squish
          DROP TRIGGER IF EXISTS "logidze_on_wellplates" on "wellplates";
        SQL
      end
    end

    reversible do |dir|
      dir.up do
        execute <<~SQL.squish
          UPDATE wellplates as t
          SET log_data = logidze_snapshot(to_jsonb(t), 'updated_at');
        SQL
      end
    end
  end
end
