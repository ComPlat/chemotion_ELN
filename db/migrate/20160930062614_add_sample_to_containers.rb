class AddSampleToContainers < ActiveRecord::Migration
  def change
    add_reference :containers, :sample, index: true
    add_foreign_key :containers, :samples
  end
end
