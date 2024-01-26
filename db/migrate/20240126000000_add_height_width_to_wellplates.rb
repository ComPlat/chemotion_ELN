class AddHeightWidthToWellplates < ActiveRecord::Migration[6.1]
  def self.up
    add_column :wellplates, :width, :integer, default: 12
    add_column :wellplates, :height, :integer, default: 8
    remove_column :wellplates, :size
  end

  def self.down
    remove_column :wellplates, :width
    remove_column :wellplates, :height
    add_column :wellplates, :size, :integer, default: 96
  end
end
