# frozen_string_literal: true

class AddLogidzeToWells < ActiveRecord::Migration[6.1]
  def change
    add_column :wells, :log_data, :jsonb

    reversible do |dir|
      dir.up do
        create_trigger :logidze_on_wells, on: :wells
      end

      dir.down do
        execute <<~SQL.squish
          DROP TRIGGER IF EXISTS "logidze_on_wells" on "wells";
        SQL
      end
    end

    reversible do |dir|
      dir.up do
        execute <<~SQL.squish
          UPDATE wells as t
          SET log_data = logidze_snapshot(to_jsonb(t), 'updated_at');
        SQL
      end
    end
  end
end
