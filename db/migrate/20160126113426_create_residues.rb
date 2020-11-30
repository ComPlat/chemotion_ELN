class CreateResidues < ActiveRecord::Migration[4.2]
  def change
    enable_extension 'hstore' unless extension_enabled?('hstore')

    create_table :residues do |t|
      t.integer :sample_id
      t.string :residue_type
      t.hstore :custom_info

      t.timestamps null: false
    end

    add_index :residues, :sample_id

    add_column :samples, :sample_svg_file, :string

    add_column :samples, :user_id, :integer
    add_column :samples, :identifier, :string
    add_column :samples, :elemental_analyses, :hstore, null: false, default: ''

    # create folder for storage of sample_svg_file
    sample_svg_folder = Rails.root + 'public/images/samples'
    unless Dir.exists? sample_svg_folder
      Dir.mkdir sample_svg_folder
    end

    add_column :molecules, :is_partial, :boolean, null: false, default: false
    remove_index :molecules, :inchikey
    add_index :molecules, [:inchikey, :is_partial], unique: true

    add_index :samples, :user_id
    add_index :samples, :identifier
  end
end
