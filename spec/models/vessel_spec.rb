require 'rails_helper'

RSpec.describe Vessel, type: :model do
  it 'is possible to create a valid collection' do
    user = create(:user)
    collection = create(:collection)

    vessel_template = VesselTemplate.create()
    vessel = Vessel.create(vessel_template: vessel_template, creator: user)

    collectionVessels = CollectionsVessel.create(collection:  collection, vessel: vessel)
  end
end
