class CreateReactionsReactantSbmmSamples < ActiveRecord::Migration[6.1]
  def up
    create_table :reactions_reactant_sbmm_samples do |t|
      t.integer :reaction_id, null: false
      t.bigint :sequence_based_macromolecule_sample_id, null: false
      t.integer :position
      t.datetime :deleted_at
      t.boolean :show_label, default: false, null: false
      t.datetime :created_at
      t.datetime :updated_at
      t.jsonb :log_data
    end

    # Create indexes with explicit short names
    add_index :reactions_reactant_sbmm_samples, :reaction_id, name: 'idx_rxn_reactant_sbmm_on_rxn_id'
    add_index :reactions_reactant_sbmm_samples, :sequence_based_macromolecule_sample_id, name: 'idx_rxn_reactant_sbmm_on_sbmm_id'
    add_index :reactions_reactant_sbmm_samples, :deleted_at, name: 'idx_rxn_reactant_sbmm_on_deleted'

    add_foreign_key :reactions_reactant_sbmm_samples, :reactions
    add_foreign_key :reactions_reactant_sbmm_samples, :sequence_based_macromolecule_samples
  end

  def down
    remove_foreign_key :reactions_reactant_sbmm_samples, :reactions
    remove_foreign_key :reactions_reactant_sbmm_samples, :sequence_based_macromolecule_samples
    drop_table :reactions_reactant_sbmm_samples
  end
end
