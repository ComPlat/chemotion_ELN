# frozen_string_literal: true

require 'rails_helper'

RSpec.describe VesselTemplate do
  let(:user) { create(:user) }
  let(:collection) { create(:collection) }
  let(:template) { create(:vessel_template) }
  let(:vessel) { create(:vessel, vessel_template: template, creator: user, collections: [collection]) }

  describe 'creation' do
    it 'is possible to create a valid vessel template' do
      expect(template.valid?).to be(true)
    end
  end

  describe 'deletion' do
    before { template.destroy! }

    it 'soft deletes template' do
      expect(template.deleted_at).not_to be_nil
    end
  end
end
