class CreateComponents < ActiveRecord::Migration[6.1]
  def change
    create_table :components do |t|
      t.references :sample, null: false, foreign_key: true
      t.string :name
      t.integer :position
      t.jsonb :component_properties

      t.timestamps
    end
  end
end
