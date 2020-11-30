class CreateMatrices < ActiveRecord::Migration[4.2]
  def change
    create_table :matrices do |t|
      t.string :name, null: false
      t.boolean :enabled, default: false
      t.string :label, null: true
      t.integer :include_ids, array: true, default: []
      t.integer :exclude_ids, array: true, default: []
      t.jsonb :configs, null: false, default: '{}'
      t.datetime :created_at
      t.datetime :updated_at
      t.datetime :deleted_at
    end

    add_index :matrices, :name, unique: true
    add_column :users, :matrix, :integer, default: 0 unless column_exists? :users, :matrix

  end
end
