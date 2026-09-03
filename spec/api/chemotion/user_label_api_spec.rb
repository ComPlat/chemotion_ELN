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
    context 'when creating a new label' do
      let(:params) { { title: 'New label', description: 'A description', color: '#123456', access_level: 1 } }

      it 'creates a label owned by the current user' do
        expect do
          put '/api/v1/user_labels/save_label', params: params, as: :json
        end.to change(UserLabel, :count).by(1)

        expect(response).to have_http_status(:success)
        expect(UserLabel.last).to have_attributes(
          user_id: user.id,
          title: 'New label',
          description: 'A description',
          color: '#123456',
          access_level: 1,
        )
      end

      it 'defaults access_level to 0 when not supplied' do
        put '/api/v1/user_labels/save_label', params: params.except(:access_level), as: :json

        expect(UserLabel.last.access_level).to eq(0)
      end

      it 'returns the created label' do
        put '/api/v1/user_labels/save_label', params: params, as: :json

        expect(parsed_json_response['title']).to eq('New label')
        expect(parsed_json_response['color']).to eq('#123456')
      end
    end

    context 'when updating an existing label' do
      it 'updates the label attributes' do
        params = { id: label_a.id, title: 'Renamed', description: 'Updated', color: '#fff000', access_level: 1 }

        put '/api/v1/user_labels/save_label', params: params, as: :json

        expect(response).to have_http_status(:success)
        expect(label_a.reload).to have_attributes(
          title: 'Renamed',
          description: 'Updated',
          color: '#fff000',
          access_level: 1,
        )
      end

      it 'does not create an additional label' do
        params = { id: label_a.id, title: 'Renamed', color: '#fff000' }

        expect do
          put '/api/v1/user_labels/save_label', params: params, as: :json
        end.not_to change(UserLabel, :count)
      end
    end

    context 'when the id belongs to another user' do
      let(:foreign_label) do
        UserLabel.create!(user_id: other_user.id, access_level: 0, title: 'Foreign', color: '#fff')
      end

      it 'returns 404 and leaves the label untouched' do
        params = { id: foreign_label.id, title: 'Hijacked', color: '#000000' }

        put '/api/v1/user_labels/save_label', params: params, as: :json

        expect(response).to have_http_status(:not_found)
        expect(foreign_label.reload).to have_attributes(title: 'Foreign', color: '#fff', user_id: other_user.id)
      end
    end
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
      sample_1.tag.update!(taggable_data: (sample_1.tag.taggable_data || {}).merge('user_labels' => [label_a.id,
                                                                                                     label_b.id]))

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

    it "preserves another user's private label while applying the caller's labels" do
      foreign = UserLabel.create!(user_id: other_user.id, access_level: 0, title: 'Foreign', color: '#fff')
      sample_1.tag.update!(taggable_data: (sample_1.tag.taggable_data || {}).merge('user_labels' => [foreign.id]))

      params = { ui_state: ui_state_for([sample_1.id]), add_label_ids: [label_a.id] }

      post '/api/v1/user_labels/bulk', params: params, as: :json

      expect(response).to have_http_status(:no_content)
      expect(sample_1.reload.tag.taggable_data['user_labels']).to contain_exactly(foreign.id, label_a.id)
    end

    it 'returns 401 and writes nothing when the user cannot update the selection' do
      foreign_collection = create(:collection, user_id: other_user.id)
      foreign_sample = create(:sample)
      CollectionsSample.create!(sample: foreign_sample, collection: foreign_collection)

      ui_state = {
        currentCollection: { id: foreign_collection.id },
        sample: { checkedAll: false, checkedIds: [foreign_sample.id], uncheckedIds: [],
                  collection_id: foreign_collection.id },
      }
      params = { ui_state: ui_state, add_label_ids: [label_a.id] }

      post '/api/v1/user_labels/bulk', params: params, as: :json

      expect(response).to have_http_status(:unauthorized)
      expect(foreign_sample.reload.tag.taggable_data['user_labels'] || []).to be_empty
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
