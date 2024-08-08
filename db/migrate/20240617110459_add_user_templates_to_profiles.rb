class AddUserTemplatesToProfiles < ActiveRecord::Migration[6.1]
  def change
    add_column :profiles, :user_templates, :string, array: true, default: []
  end
end
