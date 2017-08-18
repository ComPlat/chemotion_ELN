class AddTemplateToReport < ActiveRecord::Migration
  def change
    add_column :reports, :template, :string, default: "standard"
  end
end
