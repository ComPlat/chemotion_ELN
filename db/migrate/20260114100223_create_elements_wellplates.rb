# frozen_string_literal: true

class CreateElementsWellplates < ActiveRecord::Migration[6.1]
  def change
    create_table :elements_wellplates do |t|
      t.bigint :element_id, null: false
      t.bigint :wellplate_id, null: false
      t.datetime :created_at
      t.datetime :updated_at
      t.datetime :deleted_at
      t.jsonb :log_data

      t.index :element_id, name: 'index_elements_wellplates_on_element_id'
      t.index :wellplate_id, name: 'index_elements_wellplates_on_wellplate_id'
    end

    reversible do |dir|
      dir.up do
        execute <<~SQL.squish
          SELECT logidze_create_trigger_on_table('elements_wellplates', 'logidze_on_elements_wellplates', 'updated_at');
        SQL
      end

      dir.down do
        execute 'DROP TRIGGER IF EXISTS logidze_on_elements_wellplates on elements_wellplates;'
      end
    end
  end
end
