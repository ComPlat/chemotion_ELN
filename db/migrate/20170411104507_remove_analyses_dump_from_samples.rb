class RemoveAnalysesDumpFromSamples < ActiveRecord::Migration
  def change
    remove_column :samples, :analyses_dump
  end
end
