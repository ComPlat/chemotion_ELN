class CreateMixtures < ActiveRecord::Migration[6.1]
  def change
    create_table :mixtures do |t|
      t.string :name
      t.timestamps
    end
  end
end
