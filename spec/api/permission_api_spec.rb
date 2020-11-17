# frozen_string_literal: true

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
      let(:s1) { create(:sample, collections: [c1, c3]) }
      let(:s2) { create(:sample, collections: [c1]) }
      let(:r1) { create(:reaction, collections: [c1]) }
      let(:r2) { create(:reaction, collections: [c1]) }
      let(:w1) { create(:wellplate, collections: [c1]) }
      let(:w2) { create(:wellplate, collections: [c1]) }
      let(:sc1) { create(:screen, collections: [c1]) }

      let!(:params) do
        {
          currentCollection: { id: c1.id },
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
      end

      it 'responds with true if sharing allowed' do
        post '/api/v1/permissions/status',
          params: params.to_json,
          headers: { 'CONTENT_TYPE' => 'application/json' }

        expect(JSON.parse(response.body)['sharing_allowed']).to eq true
      end
    end
  end
end
