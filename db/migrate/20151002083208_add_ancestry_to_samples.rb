class AddAncestryToSamples < ActiveRecord::Migration
  def change
    add_column :samples, :ancestry, :string, index: true
  end
end
