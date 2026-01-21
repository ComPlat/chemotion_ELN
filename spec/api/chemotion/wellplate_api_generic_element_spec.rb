# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::WellplateAPI do
  include_context 'api request authorization context'

  let(:collection) { create(:collection, user_id: user.id, wellplate_detail_level: 10) }
  let(:first_wellplate) { create(:wellplate) }
  let(:second_wellplate) { create(:wellplate) }
  let(:element) { create(:element, creator: user) }

  before do
    CollectionsWellplate.create!(wellplate: first_wellplate, collection: collection)
    CollectionsWellplate.create!(wellplate: second_wellplate, collection: collection)
    element.collections << collection
  end

  describe 'GET /api/v1/wellplates/by_generic_element/:id' do
    context 'when element has wellplates' do
      before do
        ElementsWellplate.create!(element: element, wellplate: first_wellplate)
        ElementsWellplate.create!(element: element, wellplate: second_wellplate)
        get "/api/v1/wellplates/by_generic_element/#{element.id}"
      end

      it 'returns 200 status with wellplates' do
        body = JSON.parse(response.body)
        expect(response).to have_http_status(:ok)
        expect(body['wellplates'].size).to eq(2)
      end

      it 'returns wellplates with correct structure' do
        body = JSON.parse(response.body)
        expect(body['wellplates'].first).to include('id', 'name', 'wells')
        expect(body['wellplates'].pluck('id')).to contain_exactly(first_wellplate.id, second_wellplate.id)
      end
    end

    context 'when element has no wellplates' do
      before do
        get "/api/v1/wellplates/by_generic_element/#{element.id}"
      end

      it 'returns empty array' do
        body = JSON.parse(response.body)
        expect(response).to have_http_status(:ok)
        expect(body['wellplates']).to eq([])
      end
    end

    context 'when user is not authorized' do
      let(:other_user) { create(:user) }
      let(:other_element) { create(:element, creator: other_user) }

      before do
        get "/api/v1/wellplates/by_generic_element/#{other_element.id}"
      end

      it 'returns 401 unauthorized' do
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when element does not exist' do
      before do
        get '/api/v1/wellplates/by_generic_element/99999'
      end

      it 'returns 404 not found' do
        expect(response).to have_http_status(:not_found)
      end
    end
  end

  describe 'PUT /api/v1/wellplates/by_generic_element/:id' do
    context 'when adding wellplates' do
      let(:params) { { wellplate_ids: [first_wellplate.id, second_wellplate.id] } }

      before do
        put "/api/v1/wellplates/by_generic_element/#{element.id}", params: params, as: :json
      end

      it 'creates associations' do
        expect(response).to have_http_status(:ok)
        expect(ElementsWellplate.where(element_id: element.id).count).to eq(2)
        expect(ElementsWellplate.where(element_id: element.id).pluck(:wellplate_id))
          .to contain_exactly(first_wellplate.id, second_wellplate.id)
      end
    end

    context 'when removing wellplates' do
      before do
        ElementsWellplate.create!(element: element, wellplate: first_wellplate)
        ElementsWellplate.create!(element: element, wellplate: second_wellplate)
        put "/api/v1/wellplates/by_generic_element/#{element.id}",
            params: { wellplate_ids: [first_wellplate.id] }, as: :json
      end

      it 'removes unselected wellplates' do
        expect(response).to have_http_status(:ok)
        expect(ElementsWellplate.where(element_id: element.id).count).to eq(1)
        expect(ElementsWellplate.find_by(element_id: element.id).wellplate_id).to eq(first_wellplate.id)
      end
    end

    context 'when removing all wellplates' do
      before do
        ElementsWellplate.create!(element: element, wellplate: first_wellplate)
        ElementsWellplate.create!(element: element, wellplate: second_wellplate)
        put "/api/v1/wellplates/by_generic_element/#{element.id}", params: { wellplate_ids: [] }, as: :json
      end

      it 'removes all associations' do
        expect(response).to have_http_status(:ok)
        expect(ElementsWellplate.where(element_id: element.id).count).to eq(0)
      end
    end

    context 'when user is not authorized' do
      let(:other_user) { create(:user) }
      let(:other_element) { create(:element, creator: other_user) }

      before do
        put "/api/v1/wellplates/by_generic_element/#{other_element.id}",
            params: { wellplate_ids: [first_wellplate.id] }, as: :json
      end

      it 'returns 401 unauthorized' do
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end
end
