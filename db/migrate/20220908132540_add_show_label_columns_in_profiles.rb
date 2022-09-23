class AddShowLabelColumnsInProfiles < ActiveRecord::Migration[5.2]
  def change
    add_column :profiles, :show_sample_name, :boolean, default: false
    add_column :profiles, :show_sample_short_label, :boolean, default: false
  end
end
