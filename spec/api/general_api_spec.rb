require 'rails_helper'

describe Chemotion::GeneralAPI do
  context 'authorized user logged in' do
    let(:user) { create(:user) }
    let!(:s1)   { create(:sample) }
    let!(:r1)   { create(:reaction, id: 1) }
    let!(:c)    { create(:collection, user_id: user.id) }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
      CollectionsSample.create!(sample: s1, collection: c)
      CollectionsReaction.create!(reaction: r1, collection: c)
    end

    describe 'GET /api/v1/general/list_content' do
      before do
        params = { ids: "{\"sample\":[#{s1.id}],\"reaction\":[#{r1.id}]}" }
        get '/api/v1/general/list_content', params
      end

      it 'returns selected list content' do
        response_samples = JSON.parse(response.body)['samples']
        response_reactions = JSON.parse(response.body)['reactions']
        expect(response_samples.first["id"]).to eq s1.id
        expect(response_reactions.first["id"]).to eq r1.id
      end
    end
  end
end
