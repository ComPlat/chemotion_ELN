class AddDataToProfiles < ActiveRecord::Migration
  def change
    add_column :profiles, :data, :jsonb
  end
end
