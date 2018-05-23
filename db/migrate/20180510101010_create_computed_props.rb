class CreateComputedProps < ActiveRecord::Migration
  def change
    create_table :computed_props do |t|
      t.integer :molecule_id
      t.float :max_potential, default: 0
      t.float :min_potential, default: 0
      t.float :mean_potential, default: 0
      t.float :lumo, default: 0
      t.float :homo, default: 0
      t.float :ip, default: 0
      t.float :ea, default: 0
      t.float :dipol_debye, default: 0
      t.integer :status, default: 0
      t.jsonb :data

      t.timestamps
    end
  end
end
