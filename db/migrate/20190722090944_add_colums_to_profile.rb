class AddColumsToProfile < ActiveRecord::Migration
  def change
    add_column :profiles, :curation, :integer, default: 2
  end
end
