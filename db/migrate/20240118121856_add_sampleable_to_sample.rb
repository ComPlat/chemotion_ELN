class AddSampleableToSample < ActiveRecord::Migration[6.1]
  def change
    add_reference :samples, :sampleable, polymorphic: true, index: true
  end
end
