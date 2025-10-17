class AddFieldsToSbmmSample < ActiveRecord::Migration[6.1]
  def change
    change_table :sequence_based_macromolecule_samples do |t|
      t.string :heterologous_expression, null: false, default: 'unknown'
      t.string :organism, null: true, default: ''
      t.string :taxon_id, null: true, default: ''
      t.string :strain, null: true, default: ''
      t.string :tissue, null: true, default: ''
      t.string :localisation, null: true, default: ''
    end
  end
end
