class RemoveAnalysesDumpFromSamples < ActiveRecord::Migration[4.2]
  def change
    remove_column :samples, :analyses_dump
  end
end
