class CreateTextTemplates < ActiveRecord::Migration
  def up
    create_table :text_templates do |t|
      t.column :type, :string
      t.integer :user_id, null: false, index: true
      t.string  :name
      t.jsonb :data, default: {}
      t.datetime :deleted_at, index: true
      t.timestamps null: false
    end
    add_index :text_templates, [:name], name: "index_predefined_template",
      unique: true, where: "type = 'PredefinedTextTemplate'", using: :btree
  end

  def down
    remove_index :text_templates, name: "index_predefined_template"
    drop_table :text_templates
  end
end
