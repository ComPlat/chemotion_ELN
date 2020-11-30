class AddDescriptionAttrToSamples < ActiveRecord::Migration[4.2]
  def change
    add_column :samples, :description, :text, :default => ""
  end
end
