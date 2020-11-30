class AddShortLabelAndUserStampsToSamples < ActiveRecord::Migration[4.2]
  def change
    add_column :samples, :created_by, :integer, null: true
    add_column :samples, :short_label, :string, null: true

    add_column :users, :samples_created_count, :integer, null: true
  end
end
