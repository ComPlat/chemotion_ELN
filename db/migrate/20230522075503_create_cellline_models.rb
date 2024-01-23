class CreateCelllineModels < ActiveRecord::Migration[6.1]
  def change
    create_table :cellline_materials do |t|
      t.string :name
      t.string :source
      t.string :cell_type
      t.jsonb :organism
      t.jsonb :tissue
      t.jsonb :disease
      t.string :growth_medium
      t.string :biosafety_level
      t.string :variant
      t.string :mutation
      t.float :optimal_growth_temp
      t.string :cryo_pres_medium
      t.string :gender
      t.string :description
      t.timestamp :deleted_at
      t.timestamps
    end

    create_table :cellline_samples do |t|
      t.bigint :cellline_material_id
      t.bigint :cellline_sample_id
      t.integer :amount, limit: 8
      t.string :unit
      t.integer :passage
      t.string :contamination
      t.string :name
      t.string :description
      t.bigint :user_id
      t.timestamp :deleted_at
      t.timestamps
      t.string :short_label
    end

    create_table :collections_celllines do |t|
      t.integer "collection_id"
      t.integer "cellline_sample_id"
      t.datetime "deleted_at"
    end

    add_column :collections, :celllinesample_detail_level, :int, :default => 10
    add_column :sync_collections_users, :celllinesample_detail_level, :int, :default => 10
  end
end
