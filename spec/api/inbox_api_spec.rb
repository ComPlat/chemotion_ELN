# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::InboxAPI do
  context 'authorized user logged in' do
    let(:user) { create(:person) }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    end

    describe 'samples resource' do
      let(:collection) { create(:collection, user_id: user.id) }
      let(:sample_1) { create(:sample, name: 'JB-R581-A') }
      let(:sample_2) { create(:sample, name: 'JB-R23-A') }
      let(:sample_3) { create(:sample, name: 'JB-R23-B') }

      before do
        CollectionsSample.create!(sample: sample_1, collection: collection)
        CollectionsSample.create!(sample: sample_2, collection: collection)
        CollectionsSample.create!(sample: sample_3, collection: collection)
      end

      describe 'get samples by sample name' do
        let(:params) { { search_string: 'R23' } }

        before { get '/api/v1/inbox/samples', params }

        it 'return fitting samples' do
          expect(JSON.parse(response.body)['samples'].size).to eq(2)
        end
      end

      # /api/v1/inbox/samples/:sample_id?analyses_id=:analyses_id
      describe 'assign analyses to to sample' do
        let(:params) { { analyses_id: 123 } }

        before { post "/api/v1/inbox/samples/#{sample_2.id}", params }

        it 'return fitting samples' do
          # byebug
          expect(JSON.parse(response.body)).to eql({})
        end
      end
    end
  end
end
