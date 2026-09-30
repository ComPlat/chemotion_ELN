# frozen_string_literal: true

class CreateSampleMerges < ActiveRecord::Migration[6.1]
  def up
    create_table :sample_merges do |t|
      t.integer :source_sample_id,               null: false
      t.integer :target_sample_id,               null: false
      t.integer :reaction_id,                    null: false
      t.float   :source_amount_mol,              null: false
      t.float   :target_real_amount_value_before
      t.string  :target_real_amount_unit_before
      t.integer :target_molecule_id_before
      t.jsonb   :source_reaction_sample_attributes
      t.datetime :created_at
      t.datetime :updated_at
    end

    # Unique: a source can only be actively merged into one target at a time
    add_index :sample_merges, :source_sample_id,
              unique: true,
              name: 'index_sample_merges_on_source_sample_id'

    add_index :sample_merges, %i[target_sample_id reaction_id],
              name: 'index_sample_merges_on_target_and_reaction'

    add_foreign_key :sample_merges, :samples,
                    column: :source_sample_id,
                    name: 'fk_sample_merges_source'
    add_foreign_key :sample_merges, :samples,
                    column: :target_sample_id,
                    name: 'fk_sample_merges_target'
    add_foreign_key :sample_merges, :reactions,
                    name: 'fk_sample_merges_reaction'
  end

  def down
    remove_foreign_key :sample_merges, name: 'fk_sample_merges_source'
    remove_foreign_key :sample_merges, name: 'fk_sample_merges_target'
    remove_foreign_key :sample_merges, name: 'fk_sample_merges_reaction'
    drop_table :sample_merges
  end
end
