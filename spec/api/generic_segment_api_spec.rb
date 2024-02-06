# frozen_string_literal: true

require 'rails_helper'

# describe Chemotion::GenericSegmentAPI do
describe 'GenericSegment' do
  let!(:u_admin) { create(:user, first_name: 'Admin', last_name: 'System') }
  let!(:u1) { create(:generic_user, first_name: 'Amy', last_name: 'Happy') }
  let(:params_c) { { 'name' => 'Element', 'label' => 'Element Label', 'klass_prefix' => 'E' } }
  let!(:ek) { create(:element_klass) }
  let!(:el) { create(:element) }
  let!(:sk) { create(:segment_klass) }
  let!(:sg) { create(:segment) }
  let!(:dk) { create(:dataset_klass) }
  let!(:ds) { create(:dataset) }
  let(:c1) { create(:collection, user_id: u1.id) }
  let!(:el_pop) do
    {
      eln: { version: '0.0.2', base_revision: '0.0.1', current_revision: 0 },
      uuid: 'uuid',
      klass: 'ElementKlass',
      layers: {},
      select_options: {}
    }
  end

  before do
    Labimotion::CollectionsElement.create!(element: el, collection: c1)
  end

  context 'with authorized user logged in' do
    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(u1)
    end

    describe 'Create Generic Element Klass' do
      before do
        post '/api/v1/generic_elements/create_element_klass', params: params_c
      end

      it 'returns authorized' do
        expect(response.status).to eq 201
      end
    end

    describe 'Update Generic Element Klass' do
      before do
        post '/api/v1/generic_elements/update_element_klass', params: { id: ek.id, label: 'New Label' }
      end

      it 'returns authorized' do
        expect(response.status).to eq 201
      end

      it 'returns updated data' do
        resp = JSON.parse(response.body)['label']
        expect(resp).to eq 'New Label'
      end
    end

    describe 'Create Generic Element' do
      before do
        post '/api/v1/generic_elements', params: { element_klass: ek, name: 'Name of new element', container: { id: c1.id, attachments: [], children: c1.children, is_new: false, is_deleted: false, name: 'container' }, properties: el_pop }, as: :json
      end

      it 'returns authorized' do
        expect(response.status).to eq 201
      end

      it 'returns created data' do
        resp = JSON.parse(response.body)['element']['name']
        expect(resp).to eq 'Name of new element'
      end
    end

    describe 'Update Generic Element' do
      before do
        put "/api/v1/generic_elements/#{el.id}", params: { id: el.id, name: 'New Name', container: { id: c1.id, attachments: [], children: c1.children, is_new: false, is_deleted: false, name: 'container' }, properties: el_pop }, as: :json
      end

      it 'returns authorized' do
        expect(response.status).to eq 200
      end

      it 'returns updated data' do
        resp = JSON.parse(response.body)['element']['name']
        expect(resp).to eq 'New Name'
      end
    end

    describe 'Update Generic Element Template' do
      before do
        post '/api/v1/generic_elements/update_template', params: { klass: 'ElementKlass', id: ek.id, properties_template: el_pop }, as: :json
      end

      it 'returns authorized' do
        expect(response.status).to eq 201
      end

      it 'returns updated data' do
        resp = JSON.parse(response.body)['properties_template']['pkg']['eln']['current_revision']
        expect(resp).to eq 0
      end
    end

    describe 'Update Generic Segment Template' do
      before do
        post '/api/v1/generic_elements/update_template', params: { klass: 'SegmentKlass', id: sk.id, properties_template: el_pop }, as: :json
      end

      it 'returns authorized' do
        expect(response.status).to eq 201
      end

      it 'returns updated data' do
        resp = JSON.parse(response.body)['properties_template']['pkg']['eln']['current_revision']
        expect(resp).to eq 0
      end
    end

    describe 'Update Generic Dataset Template' do
      before do
        post '/api/v1/generic_elements/update_template', params: { klass: 'DatasetKlass', id: dk.id, properties_template: el_pop }, as: :json
      end

      it 'returns authorized' do
        expect(response.status).to eq 201
      end

      it 'returns updated data' do
        resp = JSON.parse(response.body)['properties_template']['pkg']['eln']['current_revision']
        expect(resp).to eq 0
      end
    end
  end

  context 'with unauthorized user logged in' do
    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(u_admin)
    end

    describe 'Create Generic Element Klass' do
      before do
        post '/api/v1/generic_elements/create_element_klass', params: params_c
      end

      it 'returns unauthorized' do
        expect(response.status).to eq 401
      end
    end

    describe 'Update Generic Element Klass' do
      before do
        post '/api/v1/generic_elements/update_element_klass', params: { id: ek.id, label: 'New Label' }
      end

      it 'returns unauthorized' do
        expect(response.status).to eq 401
      end
    end

    describe 'Create Generic Element' do
      before do
        post '/api/v1/generic_elements', params: { element_klass: ek, name: 'Name of new element', container: { id: c1.id, attachments: [], children: c1.children, is_new: false, is_deleted: false, name: 'container' }, properties: el_pop }, as: :json
      end

      it 'returns unauthorized' do
        expect(response.status).to eq 201
      end
    end

    describe 'Update Generic Element' do
      before do
        put "/api/v1/generic_elements/#{el.id}", params: { id: el.id, name: 'New Name', container: { id: c1.id, attachments: [], children: c1.children, is_new: false, is_deleted: false, name: 'container' }, properties: el_pop }, as: :json
      end

      it 'returns unauthorized' do
        expect(response.status).to eq 401
      end
    end

    describe 'Update Generic Element Template' do
      before do
        post '/api/v1/generic_elements/update_template', params: { klass: 'ElementKlass', id: ek.id, properties_template: el_pop }, as: :json
      end

      it 'returns unauthorized' do
        expect(response.status).to eq 401
      end
    end

    describe 'Update Generic Segment Template' do
      before do
        post '/api/v1/generic_elements/update_template', params: { klass: 'SegmentKlass', id: ek.id, properties_template: el_pop }, as: :json
      end

      it 'returns unauthorized' do
        expect(response.status).to eq 401
      end
    end

    describe 'Update Generic Dataset Template' do
      before do
        post '/api/v1/generic_elements/update_template', params: { klass: 'DatasetKlass', id: ek.id, properties_template: el_pop }, as: :json
      end

      it 'returns unauthorized' do
        expect(response.status).to eq 401
      end
    end
  end
end
