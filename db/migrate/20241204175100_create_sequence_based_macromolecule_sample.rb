class CreateSequenceBasedMacromoleculeSample < ActiveRecord::Migration[6.1]
  def change
    index_prefix = 'idx_sbmm_samples'
    create_table :sequence_based_macromolecule_samples do |t|
      t.string :name, null: false
      t.datetime :deleted_at, null: true, index: { name: "#{index_prefix}_deleted_at" }
      t.string :external_label, null: true
      t.string :short_label, null: false, unique: true
      t.string :function_or_application, null: true

      t.float :concentration_value, null: true
      t.string :concentration_unit, null: false, default: 'ng/L'

      t.float :molarity_value, null: true
      t.string :molarity_unit, null: false, default: 'mol/L'

      t.float :activity_per_volume_value, null: true
      t.string :activity_per_volume_unit, null: false, default: 'U/L'

      t.float :activity_per_mass_value, null: true
      t.string :activity_per_mass_unit, null: false, default: 'U/g'

      t.float :volume_as_used_value, null: true
      t.string :volume_as_used_unit, null: false, default: 'L'

      t.float :amount_as_used_mol_value, null: true
      t.string :amount_as_used_mol_unit, null: false, default: 'mol'

      t.float :amount_as_used_mass_value, null: true
      t.string :amount_as_used_mass_unit, null: false, default: 'g'

      t.float :activity_value, null: true
      t.string :activity_unit, null: false, default: 'U'

      t.belongs_to :sequence_based_macromolecule, foreign_key: true, index: { name: "#{index_prefix}_sbmm" }
      t.belongs_to :user, foreign_key: true, index: { name: "#{index_prefix}_user" }
      t.timestamps
    end
  end
end
