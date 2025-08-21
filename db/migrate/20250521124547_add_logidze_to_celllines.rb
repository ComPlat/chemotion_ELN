# frozen_string_literal: true

class AddLogidzeToCelllines < ActiveRecord::Migration[6.1]
  def change
    add_column :cellline_materials, :log_data, :jsonb
    add_column :cellline_samples, :log_data, :jsonb

    reversible do |dir|
      dir.up do
        execute <<~SQL.squish
          SELECT logidze_create_trigger_on_table('cellline_materials', 'logidze_on_cellline_materials', 'updated_at');
          SELECT logidze_create_trigger_on_table('cellline_samples', 'logidze_on_cellline_samples', 'updated_at');
        SQL

        execute <<~SQL.squish
          UPDATE cellline_materials as t
          SET log_data = logidze_snapshot(to_jsonb(t), 'updated_at');
        SQL
        execute <<~SQL.squish
          UPDATE cellline_samples as t
          SET log_data = logidze_snapshot(to_jsonb(t), 'updated_at');
        SQL
      end

      dir.down do
        execute 'DROP TRIGGER IF EXISTS logidze_on_cellline_materials on cellline_materials;'
        execute 'DROP TRIGGER IF EXISTS logidze_on_cellline_samples on cellline_samples;'
      end
    end
  end
end
