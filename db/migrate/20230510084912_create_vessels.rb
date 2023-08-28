# frozen_string_literal: true

class CreateVessels < ActiveRecord::Migration[6.1]
  def change
    reversible do |dir|
      dir.up do
        d = {
          samples: 0,
          reactions: 0,
          wellplates: 0,
          vessels: 0,
        }
        change_column :users, :counters, :hstore, null: false, default: d
      end
      dir.down do
        d = {
          samples: 0,
          reactions: 0,
          wellplates: 0
        }
        change_column :users, :counters, :hstore, null: false, default: d
      end
    end

    create_table :vessel_templates do |t|
      t.string :name
      t.string :details
      t.string :vessel_type
      t.string :volume_unit
      t.integer :volume_amount
      t.string :material_type
      t.string :material_details
      t.timestamps
      t.datetime :deleted_at
    end

    create_table :vessels do |t|
      t.bigint :vessel_template_id
      t.bigint :user_id
      t.string :name
      t.string :short_label
      t.string :description
      t.timestamps
      t.datetime :deleted_at
      t.index :deleted_at
    end

    create_table :collections_vessels do |t|
      t.integer :collection_id
      t.integer :vessel_id
      t.datetime :deleted_at
      t.index :collection_id
      t.index :deleted_at
      t.index %i[vessel_id collection_id], unique: true
    end
  end
end
