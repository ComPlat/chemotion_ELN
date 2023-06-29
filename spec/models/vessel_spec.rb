require 'rails_helper'

RSpec.describe Vessel, type: :model do
  let(:user) { create(:user) }
  let(:collection) { create(:collection) }
  let(:template) { create(:vessel_template) }
  let(:vessel) { create(:vessel, vessel_template: template, creator: user, collections: [collection]) }

  describe 'creation' do
    it 'is possible to create a valid vessel' do
      expect(vessel.valid?).to be(true)
    end
  end

  describe 'after creation' do
    it 'has associations' do
      expect(CollectionsVessel.find_by(vessel_id: vessel.id)).not_to be_nil
    end
  end

  describe 'deletion' do
    before { vessel.destroy! }
    it 'destroys associations properly' do
      expect(CollectionsVessel.find_by(vessel_id: vessel.id)).to be_nil
    end

    it 'soft deletes vessel' do
      expect(vessel.deleted_at).not_to be_nil
    end
  end
end