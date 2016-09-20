class AddContainerToSamples < ActiveRecord::Migration
  def change
    add_reference :samples, :container, index: true
    add_foreign_key :samples, :containers
  end
end
