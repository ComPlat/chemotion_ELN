class AddCodeLog < ActiveRecord::Migration[4.2]
  def change
    create_table :code_logs do |t|
      t.string :code_type, null: false
      t.string :value, null: false
      t.string :source
      t.integer :source_id
    end
  end
end
