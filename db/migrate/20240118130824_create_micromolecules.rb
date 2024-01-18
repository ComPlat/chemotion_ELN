class CreateMicromolecules < ActiveRecord::Migration[6.1]
  def change
    create_table :micromolecules do |t|
      t.string :name
      t.timestamps
    end
  end
end
