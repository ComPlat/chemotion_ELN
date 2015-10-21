class AddAnalysesDumpToSamples < ActiveRecord::Migration
  def change
    add_column :samples, :analyses_dump, :text
  end
end
