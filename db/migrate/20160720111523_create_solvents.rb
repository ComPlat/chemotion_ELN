class CreateSolvents < ActiveRecord::Migration[4.2]
  def change
    create_table :reactions_solvent_samples do |t|
      t.integer :reaction_id
      t.integer :sample_id
      t.boolean :reference, null: true
      t.float :equivalent, null: true
      t.datetime :deleted_at

      t.index :reaction_id
      t.index :sample_id
      t.index :deleted_at
    end
  end
end
