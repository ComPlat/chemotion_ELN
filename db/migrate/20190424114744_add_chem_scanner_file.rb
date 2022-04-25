class AddChemScannerFile < ActiveRecord::Migration[5.2]
  def change
    create_table :chemscanner_sources do |t|
      t.integer :parent_id
      t.integer :file_id, null: false
      t.jsonb :extended_metadata, default: {}

      t.integer :created_by, null: false
      t.timestamps null: false
    end

    create_table :chemscanner_schemes do |t|
      t.integer :source_id, null: false
      t.boolean :is_approved, default: false
      t.jsonb :extended_metadata, default: {}

      t.integer :index, default: 0
      t.string :image_data, default: ''
      t.string :version, default: ''
      t.integer :created_by, null: false
      t.timestamps null: false
      t.datetime :deleted_at
    end

    create_table :chemscanner_reactions do |t|
      t.integer :scheme_id, null: false
      t.integer :external_id, null: false
      t.integer :clone_from

      t.string :description
      t.string :temperature
      t.string :time
      t.string :status
      t.float :yield
      t.jsonb :details, default: {}
      t.jsonb :extended_metadata, default: {}

      t.boolean :is_approved, default: false
      t.integer :imported_id
      t.timestamps null: false
      t.datetime :deleted_at
    end

    create_table :chemscanner_reaction_steps do |t|
      t.integer :reaction_id, null: false
      t.integer :reaction_external_id, null: false

      t.integer :reagent_ids, array: true, default: []
      t.string :reagent_smiles, array: true, default: []
      t.integer :step_number, null: false
      t.string :description
      t.string :temperature
      t.string :time

      t.timestamps null: false
      t.datetime :deleted_at
    end

    create_table :chemscanner_molecules do |t|
      t.integer :scheme_id, null: false
      t.integer :external_id
      t.integer :clone_from

      t.string :mdl
      t.string :cano_smiles
      t.string :label
      t.string :abbreviation
      t.string :description
      t.jsonb :aliases, default: {}
      t.jsonb :details, default: {}
      t.jsonb :extended_metadata, default: {}

      t.boolean :is_approved, default: false
      t.integer :imported_id
      t.timestamps null: false
      t.datetime :deleted_at
    end

    create_table :chemscanner_reactions_molecules do |t|
      t.integer :reaction_id, null: false
      t.integer :molecule_id, null: false
      t.string :type, null: false

      t.timestamps null: false
      t.datetime :deleted_at
    end
  end

  def down
    drop_table :chemscanner_files
  end
end
