class CreateProteinSequenceModifications < ActiveRecord::Migration[6.1]
  def change
    index_prefix = 'idx_sbmm_psm'
    create_table :protein_sequence_modifications do |t|
      t.boolean :modification_n_terminal, null: false, default: false
      t.string :modification_n_terminal_details, null: true, default: ''
      t.boolean :modification_c_terminal, null: false, default: false
      t.string :modification_c_terminal_details, null: true, default: ''
      t.boolean :modification_insertion, null: false, default: false
      t.string :modification_insertion_details, null: true, default: ''
      t.boolean :modification_deletion, null: false, default: false
      t.string :modification_deletion_details, null: true, default: ''
      t.boolean :modification_mutation, null: false, default: false
      t.string :modification_mutation_details, null: true, default: ''
      t.boolean :modification_other, null: false, default: false
      t.string :modification_other_details, null: true, default: ''
      t.datetime :deleted_at, null: true, index: { name: "#{index_prefix}_deleted_at" }
      t.timestamps
    end
  end
end
