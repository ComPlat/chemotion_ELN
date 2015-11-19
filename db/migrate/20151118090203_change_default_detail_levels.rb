class ChangeDefaultDetailLevels < ActiveRecord::Migration
  def change
    change_column :collections, :sample_detail_level, :integer, default: 10
    change_column :collections, :reaction_detail_level, :integer, default: 10
    change_column :collections, :screen_detail_level, :integer, default: 10
    change_column :collections, :wellplate_detail_level, :integer, default: 10
  end
end
