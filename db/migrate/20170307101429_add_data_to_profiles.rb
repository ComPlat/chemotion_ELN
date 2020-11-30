class AddDataToProfiles < ActiveRecord::Migration[4.2]
  def change
    add_column :profiles, :data, :jsonb
  end
end
