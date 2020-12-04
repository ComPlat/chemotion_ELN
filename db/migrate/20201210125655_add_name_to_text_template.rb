class AddNameToTextTemplate < ActiveRecord::Migration
  def up
    add_column :text_templates, :name, :string
    add_index :text_templates, [:name], name: "index_predefined_template",
      unique: true, where: "type = 'PredefinedTextTemplate'", using: :btree
  end

  def down
    remove_column :text_templates, :name, :string
    remove_index :text_templates, name: "index_predefined_template"
  end
end
