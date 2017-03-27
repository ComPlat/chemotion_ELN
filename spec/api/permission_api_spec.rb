require 'rails_helper'

describe Chemotion::PermissionAPI do
  context 'authorized user logged in' do
    let(:user)     { create(:user, first_name: 'Musashi', last_name: 'M') }
    let(:u2)       { create(:user) }
    let(:c1)       { create(:collection, user: user, is_shared: false) }
    let(:c2)       { create(:collection, shared_by_id: u2.id, is_shared: true) }
    let(:c3)       { create(:collection, user: user, is_shared: false) }
    let(:sample_a) { create(:sample) }
    let(:sample_b) { create(:sample) }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    end

    describe 'POST /api/v1/permissions/sharing' do
      let(:s1) { create(:sample) }
      let(:s2) { create(:sample) }
      let(:r1) { create(:reaction) }
      let(:r2) { create(:reaction) }
      let(:w1) { create(:wellplate) }
      let(:w2) { create(:wellplate) }
      let(:sc1) { create(:screen) }

      let!(:params) {
        {
          elements_filter: {
            sample: {
              all: true,
              included_ids: [],
              excluded_ids: []
            },
            reaction: {
              all: true,
              included_ids: [],
              excluded_ids: [r2.id]
            },
            wellplate: {
              all: false,
              included_ids: [w1.id],
              excluded_ids: []
            },
            screen: {
              all: false,
              included_ids: [sc1.id],
              excluded_ids: []
            }
          }
        }
      }

      before do
        CollectionsSample.create!(collection_id: c1.id, sample_id: s1.id)
        CollectionsSample.create!(collection_id: c3.id, sample_id: s1.id)
        CollectionsSample.create!(collection_id: c1.id, sample_id: s2.id)
        CollectionsSample.create!(collection_id: c2.id, sample_id: sample_a.id)
        CollectionsReaction.create!(collection_id: c1.id, reaction_id: r1.id)
        CollectionsReaction.create!(collection_id: c1.id, reaction_id: r2.id)
        CollectionsWellplate.create!(collection_id: c1.id, wellplate_id: w1.id)
        CollectionsWellplate.create!(collection_id: c1.id, wellplate_id: w2.id)
        CollectionsScreen.create!(collection_id: c1.id, screen_id: sc1.id)

        post '/api/v1/permissions/status', params
      end


      it 'responds with true if sharing allowed' do
        expect(JSON.parse(response.body)['sharing_allowed']).to eq true
      end
    end
  end
end
