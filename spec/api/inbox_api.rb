# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::InboxAPI do
  context 'authorized user logged in' do
    let(:user) { create(:person) }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    end

    describe 'xxxx' do
      context 'xxxx' do
        let(:collection) { create(:collection, user_id: user.id) }
        let(:sample_1) { create(:sample, name: '') }
        let(:sample_2) { create(:sample, name: '') }
        let(:params) { { search_string: 'abc' } }

        before do
          CollectionsSample.create!(sample: sample_1, collection: collection)
          CollectionsSample.create!(sample: sample_2, collection: collection)
        end

        describe 'xxxx' do
          before { get '/api/v1/inbox/samples', params }

          it 'xxx' do
            expect(JSON.parse(response.body)['samples'].size).to eq(2)
          end
        end
      end
    end
  end
end
