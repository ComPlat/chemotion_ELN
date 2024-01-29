class RemovePolymorphicAssociationFromSamples < ActiveRecord::Migration[6.1]
  def change
    remove_reference :samples, :sampleable, polymorphic: true, index: true
  end
end
