class AddTabsSegmentToCollection < ActiveRecord::Migration[5.2]
  def change
    add_column :collections, :tabs_segment, :jsonb, default: {}
  end
end
