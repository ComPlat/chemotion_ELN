class CreateChemicals < ActiveRecord::Migration[5.2]
  def change
    create_table :chemicals do |t|
      t.integer :sample_id
      t.text :cas
      t.jsonb :chemical_data
    end
    add_index :chemicals, [:sample_id]
  end
end
