class CreateMoleculeNames < ActiveRecord::Migration
  def change
    create_table :molecule_names do |t|
      t.belongs_to :molecule, index: true
      t.belongs_to :user, index: true

      t.text :description
      t.string :name, null: false, index: true

      t.datetime :deleted_at, index: true

      t.timestamps null: false
    end

    add_index :molecule_names, [:user_id, :molecule_id]

    add_column :samples, :molecule_name_id, :integer
    add_index  :samples, :molecule_name_id
  end
end
