class CreateSequenceBasedMacromolecule < ActiveRecord::Migration[6.1]
  def change
    create_table :sequence_based_macromolecules do |t|
      t.string :identifier, null: false, index: true, unique: true
      t.jsonb :uniprot_source, null: false
      t.belongs_to :parent, index: true, null: true
      t.string :sbmm_type, null: false
      t.string :sbmm_subtype, null: false
      t.string :uniprot_derivation, null: false
      t.boolean :protein_sequence_modifications, null: false, default: false
      t.boolean :post_translational_sequence_modifications, null: false, default: false
      t.string :accessions, null: true, index: true, array: true
      t.string :ec_numbers, null: true, index: true, array: true
      t.string :pdb_doi, null: true, index: true
      t.string :systematic_name, null: true, index: true
      t.float :molecular_weight, null: true
      t.string :sequence, null: false, index: true
      t.string :link_uniprot, null: true
      t.string :link_pdb, null: true
      t.references :protein_sequence_modifications, null: true
      t.string :heterologous_expression, null: false, default: 'unknown'
      t.string :organism, null: true, default: ''
      t.string :taxon_id, null: true, default: ''
      t.string :strain, null: true, default: ''
      t.string :tissue, null: true, default: ''
      t.string :localisation, null: true, default: ''
      t.string :protein_source_details_comments, null: true, default: ''
      t.string :protein_source_details_expression_system, null: true, default: ''
      t.references :post_translational_modifications, null: true

      t.datetime :deleted_at, null: true, index: true
      t.timestamps
    end
  end
end
