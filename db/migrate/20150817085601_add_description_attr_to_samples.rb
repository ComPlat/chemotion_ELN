class AddDescriptionAttrToSamples < ActiveRecord::Migration
  def change
    add_column :samples, :description, :text
  end
end
