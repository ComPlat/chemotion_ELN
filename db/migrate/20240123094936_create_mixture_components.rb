class CreateMixtureComponents < ActiveRecord::Migration[6.1]
  def change
    create_table :mixture_components, force: :cascade do |t|
      t.references :mixture, foreign_key: true, null: false
      t.references :sample, foreign_key: true, null: false
      
      t.timestamps
    end
  end
end
