class CreateSequenceBasedMacromoleculeSample < ActiveRecord::Migration[6.1]
  def change
    create_table :sequence_based_macromolecule_samples do |t|
      t.string :name, null: false
      t.datetime :deleted_at, null: true, index: true
      t.string :external_label, null: true
      t.string :short_label, null: false, unique: true
      # t.string :identifier
      # t.float :target_amount_value, default: 0.0
      # t.string :target_amount_unit, default: "g"
      # t.float :real_amount_value, default: 0.0
      # t.float :real_amount_unit, default: 'g'
      t.belongs_to :sequence_based_macromolecule, foreign_key: true, index: true
      t.timestamps
    end
  end
end
