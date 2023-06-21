class CreateChemicals < ActiveRecord::Migration[5.2]
  def change
    create_table :chemicals do |t|
      t.integer :sample_id, unique: true
      t.text :cas
      t.jsonb :chemical_data
    end
  end
end
