# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::UserLabelAPI do
  include_context 'api request authorization context'

  let(:other_user) { create(:person) }
  let(:collection) { create(:collection, user_id: user.id) }
  let(:label_a) { UserLabel.create!(user_id: user.id, access_level: 0, title: 'A', color: '#aaa') }
  let(:label_b) { UserLabel.create!(user_id: user.id, access_level: 0, title: 'B', color: '#bbb') }
  let(:sample_1) { create(:sample) }
  let(:sample_2) { create(:sample) }

  before do
    CollectionsSample.create!(sample: sample_1, collection: collection)
    CollectionsSample.create!(sample: sample_2, collection: collection)
  end

  describe 'GET /api/v1/user_labels/list_labels' do
    context 'when user labels present' do
      before do
        UserLabel.create!(user_id: user.id, access_level: 0, title: 'Label 1', color: 'Color 1')
        UserLabel.create!(user_id: other_user.id, access_level: 1, title: 'Label 2', color: 'Color 2')
        UserLabel.create!(user_id: other_user.id, access_level: 0, title: 'Label 3', color: 'Color 3')
        get '/api/v1/user_labels/list_labels'
      end

      it 'returns a list of user labels' do
        expect(parsed_json_response['labels'].length).to eq(2)
      end
    end

    context 'when user labels missing' do
      before do
        get '/api/v1/user_labels/list_labels'
      end

      it 'returns an empty list of user labels' do
        expect(parsed_json_response['labels'].length).to eq(0)
      end
    end
  end

  describe 'PUT /api/v1/user_labels/save_label' do
    pending 'TODO: Add missing spec'
  end

  def ui_state_for(sample_ids)
    {
      currentCollection: { id: collection.id },
      sample: {
        checkedAll: false,
        checkedIds: sample_ids,
        uncheckedIds: [],
        collection_id: collection.id,
      },
    }
  end

  describe 'POST /api/v1/user_labels/bulk' do
    it 'adds labels to the selected samples' do
      params = { ui_state: ui_state_for([sample_1.id, sample_2.id]), add_label_ids: [label_a.id, label_b.id] }

      post '/api/v1/user_labels/bulk', params: params, as: :json

      expect(response).to have_http_status(:no_content)
      expect(sample_1.reload.tag.taggable_data['user_labels']).to contain_exactly(label_a.id, label_b.id)
      expect(sample_2.reload.tag.taggable_data['user_labels']).to contain_exactly(label_a.id, label_b.id)
    end

    it 'removes labels from the selected samples while preserving others' do
      sample_1.tag.update!(taggable_data: (sample_1.tag.taggable_data || {}).merge('user_labels' => [label_a.id, label_b.id]))

      params = { ui_state: ui_state_for([sample_1.id]), remove_label_ids: [label_a.id] }

      post '/api/v1/user_labels/bulk', params: params, as: :json

      expect(response).to have_http_status(:no_content)
      expect(sample_1.reload.tag.taggable_data['user_labels']).to eq [label_b.id]
    end

    it 'rejects label ids the user does not own' do
      other_user = create(:person)
      foreign = UserLabel.create!(user_id: other_user.id, access_level: 0, title: 'X', color: '#000')

      params = { ui_state: ui_state_for([sample_1.id]), add_label_ids: [foreign.id] }

      post '/api/v1/user_labels/bulk', params: params, as: :json

      expect(response).to have_http_status(:forbidden)
      expect(sample_1.reload.tag.taggable_data['user_labels'] || []).to be_empty
    end

    it 'returns 400 when no labels are supplied' do
      params = { ui_state: ui_state_for([sample_1.id]) }

      post '/api/v1/user_labels/bulk', params: params, as: :json

      expect(response).to have_http_status(:bad_request)
    end

    context 'with generic elements' do
      let(:element_klass) { create(:element_klass, name: 'ElementKlassUserLabel') }
      let(:generic_el) { create(:element, element_klass: element_klass, creator: user) }

      before do
        Labimotion::CollectionsElement.create!(element: generic_el, collection: collection)
      end

      it 'adds labels to the selected generic elements' do
        ui_state = {
          currentCollection: { id: collection.id },
          element_klass.name => {
            checkedAll: false,
            checkedIds: [generic_el.id],
            uncheckedIds: [],
            collection_id: collection.id,
          },
        }
        params = { ui_state: ui_state, add_label_ids: [label_a.id] }

        post '/api/v1/user_labels/bulk', params: params, as: :json

        expect(response).to have_http_status(:no_content)
        expect(generic_el.reload.tag.taggable_data['user_labels']).to contain_exactly(label_a.id)
      end
    end
  end
end
