class CreateMixtureComponents < ActiveRecord::Migration[6.1]
  def change
    create_table :mixture_components do |t|
      t.references :mixture, null: false, foreign_key: true
      t.references :sampleable, polymorphic: true, null: false

      t.timestamps
    end
  end
end
