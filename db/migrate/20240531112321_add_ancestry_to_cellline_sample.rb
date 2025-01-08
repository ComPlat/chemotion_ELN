class AddAncestryToCelllineSample < ActiveRecord::Migration[6.1]
  def change
    add_column :cellline_samples, :ancestry, :string
    add_index :cellline_samples, :ancestry
  end
end
