class CreateCelllineModels < ActiveRecord::Migration[6.1]
  def change
    create_table :cellline_materials do |t|
      t.string :names
      t.string :cell_type
      t.jsonb :organism
      t.jsonb :tissue
      t.jsonb :disease
      t.string :biosafety_level
      t.string :variant
      t.float :optimal_growth_temp
      t.string :cryo_pres_medium
      t.string :gender
      t.string :description
      t.timestamp :deleted_at
      t.timestamps
    end

    create_table :cellline_samples do |t|
      t.bigint :cellline_material_id
      t.integer :amount
      t.integer :passage
      t.string :contamination
      t.string :source
      t.string :growth_medium
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
  end
end
