class CreateSequenceBasedMacromolecule < ActiveRecord::Migration[6.1]
  def change
    index_prefix = 'idx_sbmm'
    create_table :sequence_based_macromolecules do |t|
      t.string :identifier, null: false, index: { name: "#{index_prefix}_identifier", unique: true }
      t.jsonb :uniprot_source, null: false
      t.belongs_to :parent, index: { name: "#{index_prefix}_parent" }, null: true
      t.string :sbmm_type, null: false
      t.string :sbmm_subtype, null: false
      t.string :uniprot_derivation, null: false
      t.string :primary_accession, null: true, index: { name: "#{index_prefix}_primary_accession" }
      t.string :accessions, null: true, index: { name: "#{index_prefix}_accessions" }, array: true
      t.string :ec_numbers, null: true, index: { name: "#{index_prefix}_ec_numbers" }, array: true
      t.string :pdb_doi, null: true, index: { name: "#{index_prefix}_pdb_doi" }
      t.string :systematic_name, null: true, index: { name: "#{index_prefix}_systematic_name" }
      t.float :molecular_weight, null: true
      t.string :sequence, null: false, index: { name: "#{index_prefix}_sequence" }
      t.string :link_uniprot, null: true
      t.string :link_pdb, null: true
      t.belongs_to :protein_sequence_modifications, null: true, index: { name: "#{index_prefix}_psm_id" }
      t.string :heterologous_expression, null: false, default: 'unknown'
      t.string :organism, null: true, default: ''
      t.string :taxon_id, null: true, default: ''
      t.string :strain, null: true, default: ''
      t.string :tissue, null: true, default: ''
      t.string :localisation, null: true, default: ''
      t.string :protein_source_details_comments, null: true, default: ''
      t.string :protein_source_details_expression_system, null: true, default: ''
      t.belongs_to :post_translational_modifications, null: true, index: { name: "#{index_prefix}_ptm_id" }

      t.datetime :deleted_at, null: true, index: { name: "#{index_prefix}_deleted_at" }
      t.timestamps
    end
  end
end
