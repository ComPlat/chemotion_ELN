# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::ElementAPI do
  context 'authorized user logged in' do
    let(:user) { create(:user) }
    let!(:c)    { create(:collection, user_id: user.id) }
    let!(:s1)   { create(:sample, collections: [c]) }
    let!(:r1)   { create(:reaction, collections: [c]) }

    let(:params) do
      {
        sample: { checkedIds: [s1.id] },
        reaction: { checkedIds: [r1.id] },
        currentCollection: { id: c.id }
      }
    end

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    end

    describe 'POST /api/v1/ui_state w currentCollection params' do
      before { post '/api/v1/ui_state/', params.to_json, 'CONTENT_TYPE' => 'application/json' }

      it 'returns selected list content' do
        response_samples = JSON.parse(response.body)['samples']
        response_reactions = JSON.parse(response.body)['reactions']
        expect(response_samples.first['id']).to eq s1.id
        expect(response_reactions.first['id']).to eq r1.id
      end
    end
  end
end
