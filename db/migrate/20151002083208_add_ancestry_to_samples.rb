class AddAncestryToSamples < ActiveRecord::Migration[4.2]
  def change
    add_column :samples, :ancestry, :string, index: true
  end
end
