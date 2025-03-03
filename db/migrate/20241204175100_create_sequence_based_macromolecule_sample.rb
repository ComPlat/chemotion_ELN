class CreateSequenceBasedMacromoleculeSample < ActiveRecord::Migration[6.1]
  def change
    create_table :sequence_based_macromolecule_samples do |t|
      t.string :name, null: false
      t.datetime :deleted_at, null: true, index: true
      t.string :external_label, null: true
      t.string :short_label, null: false, unique: true
      t.string :function_or_application, null: true
      t.float :concentration, null: true
      t.float :molarity, null: true
      t.float :volume_as_used, null: true

      t.belongs_to :sequence_based_macromolecule, foreign_key: true, index: { name: 'idx_sbmm_sample_on_sbmm_id' }
      t.timestamps
    end
  end
end
