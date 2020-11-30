class AddTemplateToReport < ActiveRecord::Migration[4.2]
  def change
    add_column :reports, :template, :string, default: "standard"
  end
end
