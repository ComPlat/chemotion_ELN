class CreateNmrSimNmrSimulations < ActiveRecord::Migration[4.2]
  def change
    create_table :nmr_sim_nmr_simulations do |t|
      t.integer :molecule_id
      t.text :path_1h
      t.text :path_13c
      t.text :source
      t.datetime :deleted_at

      t.timestamps null: false
    end

    add_index :nmr_sim_nmr_simulations, [:molecule_id, :source], unique: true
    add_index :nmr_sim_nmr_simulations, :deleted_at
  end
end
