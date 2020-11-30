class AddColumsToProfile < ActiveRecord::Migration[4.2]
  def change
    add_column :profiles, :curation, :integer, default: 2
  end
end
