class AddSourceToMeasurements < ActiveRecord::Migration[5.2]
  def change
    add_reference :measurements, :source, polymorphic: true, index: true
  end
end
