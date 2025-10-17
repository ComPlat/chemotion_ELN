class AddMoreFieldsToSbmmSample < ActiveRecord::Migration[6.1]
  def change
    change_table :sequence_based_macromolecule_samples do |t|
      t.string :obtained_by, null: true, default: ''
      t.string :supplier, null: true, default: ''
      t.string :formulation, null: true, default: ''
      t.float :purity, null: true, default: ''
      t.string :purity_detection, null: true, default: ''
      t.string :purification_method, null: true, default: ''
    end
  end
end
