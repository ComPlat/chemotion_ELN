class AddAnalysesDumpToSamples < ActiveRecord::Migration[4.2]
  def change
    add_column :samples, :analyses_dump, :text
  end
end
