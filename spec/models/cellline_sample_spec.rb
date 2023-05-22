require 'rails_helper'

RSpec.describe CelllineSample, type: :model do
  it 'is possible to create a valid collection' do
   user = create(:user)
   collection=create(:collection)

   material = CelllineMaterial.create()
   sample = CelllineSample.create(cellline_material: material,creator:user)
   
   

   collectionSamples = CollectionsCellline.create(collection: collection, cellline_sample: sample)   
  end
end
