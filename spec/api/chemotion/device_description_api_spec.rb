# frozen_string_literal: true

describe Chemotion::DeviceDescriptionAPI do
  include_context 'api request authorization context'

  let(:user) { create(:user) }
  let(:collection) { create(:collection, user: user) }
  let(:device_description) { create(:device_description, :with_ontologies, creator: collection.user) }
  let(:device_description2) { create(:device_description, :with_ontologies, creator: collection.user) }
  let(:device_description_collection) do
    create(:collections_device_description, device_description: device_description, collection: collection)
  end
  let(:element_klass) { create(:element_klass, :for_device_descriptions) }
  let(:segment_klass) { create(:segment_klass, :with_ontology_properties_template, element_klass: element_klass) }

  describe 'GET /api/v1/device_descriptions/' do
    before { device_description_collection }

    let(:params) do
      { collection_id: collection.id }
    end

    it 'fetches device descriptions by collection id' do
      get '/api/v1/device_descriptions/', params: params

      expect(parsed_json_response['device_descriptions'].size).to be(1)
    end

    context 'when collection_id points to a collection shared with the user' do
      let(:shared_collection) do
        create(:collection, user: create(:person)).tap do |c|
          create(:collection_share, collection: c, shared_with: user,
                                    permission_level: CollectionShare.permission_level(:read_elements))
        end
      end
      let(:shared_device_description) do
        create(:device_description, :with_ontologies, creator: shared_collection.user)
      end

      before do
        create(:collections_device_description,
               device_description: shared_device_description, collection: shared_collection)
      end

      it 'returns the device descriptions from the shared collection' do
        get '/api/v1/device_descriptions/', params: { collection_id: shared_collection.id }

        expect(parsed_json_response['device_descriptions'].pluck('id')).to include(shared_device_description.id)
      end
    end
  end

  describe 'POST /api/v1/device_descriptions' do
    let(:device_description_params) { attributes_for(:device_description, collection_id: collection.id) }

    context 'when creating a device description' do
      it 'returns a device description' do
        post '/api/v1/device_descriptions', params: device_description_params

        expect(parsed_json_response['device_description']['short_label']).to include('Dev')
      end

      it 'has taggable_data' do
        post '/api/v1/device_descriptions', params: device_description_params

        expect(parsed_json_response['device_description']['tag']['taggable_data'].size).to be(1)
      end
    end
  end

  describe 'GET /api/v1/device_descriptions/:id' do
    it 'fetches an device description by id' do
      get "/api/v1/device_descriptions/#{device_description.id}"

      expect(parsed_json_response['device_description']['name']).to eql(device_description.name)
    end
  end

  describe 'GET /api/v1/device_descriptions/ontologies' do
    before do
      segment_klass
    end

    context 'when getting ontologies of segments' do
      it 'returns ontology' do
        get '/api/v1/device_descriptions/ontologies'

        expect(parsed_json_response.size).to be(2)
      end
    end
  end

  describe 'POST /api/v1/device_descriptions/ui_state/' do
    before do
      device_description_collection
    end

    let(:params) do
      {
        ui_state: {
          all: false,
          included_ids: [device_description.id, device_description2.id],
          excluded_ids: [],
          collection_id: collection.id,
        },
        limit: 1,
      }
    end

    it 'fetches only one device description' do
      post '/api/v1/device_descriptions/ui_state/', params: params, as: :json

      expect(parsed_json_response['device_descriptions'].size).to be(1)
    end
  end

  describe 'POST /api/v1/device_descriptions/sub_device_descriptions/' do
    before do
      device_description_collection
    end

    let(:params) do
      {
        ui_state: {
          currentCollectionId: collection.id,
          device_description: {
            all: false,
            included_ids: [device_description.id],
            excluded_ids: [],
          },
        },
      }
    end

    it 'creates a split of selected device description' do
      post '/api/v1/device_descriptions/sub_device_descriptions/', params: params, as: :json

      expect(device_description.reload.children.size).to be(1)
    end

    context 'when the device description has a segment' do
      let(:segment_properties) do
        linked_sample = create(:sample)
        segment_klass.properties_release.deep_dup.tap do |properties|
          fields = properties['layers']['ontology_fields']['fields']
          fields.first['value'] = 'entered value'
          fields << { 'type' => 'drag_sample', 'field' => 'linked_sample', 'position' => 3,
                      'value' => { 'el_id' => linked_sample.id, 'el_label' => linked_sample.short_label } }
          fields << { 'type' => 'upload', 'field' => 'linked_upload', 'position' => 4,
                      'value' => { 'files' => [{ 'aid' => 1, 'uid' => 'parent-file', 'filename' => 'a.txt' }] } }
        end
      end
      let!(:segment) do
        create(:segment, segment_klass: segment_klass, element: device_description, created_by: user.id,
                         properties: segment_properties)
      end

      def field_value(segment, name)
        segment.properties.dig('layers', 'ontology_fields', 'fields').find { |f| f['field'] == name }['value']
      end

      it 'copies the segment with its field values to the split' do
        post '/api/v1/device_descriptions/sub_device_descriptions/', params: params, as: :json

        split_segments = device_description.reload.children.first.segments
        expect(split_segments.map(&:segment_klass_id)).to eq([segment_klass.id])
        expect(split_segments.first.properties.dig('layers', 'ontology_fields', 'fields', 0, 'value'))
          .to eq('entered value')
        expect(device_description.segments.reload).to eq([segment])
      end

      it 'clears linked sample and upload fields on the split' do
        post '/api/v1/device_descriptions/sub_device_descriptions/', params: params, as: :json

        split_segment = device_description.reload.children.first.segments.first
        expect(field_value(split_segment, 'linked_sample')).to eq({})
        expect(field_value(split_segment, 'linked_upload')).to eq({})
      end

      it 'keeps linked sample and upload fields on the parent' do
        post '/api/v1/device_descriptions/sub_device_descriptions/', params: params, as: :json

        expect(field_value(segment.reload, 'linked_sample')['el_id']).to be_present
        expect(field_value(segment, 'linked_upload')['files'].size).to eq(1)
      end
    end

    context 'when the segment follows a release this instance cannot resolve' do
      let(:imported_release) { segment_klass.properties_release.merge('uuid' => 'imported-release') }

      before do
        create(:segment, segment_klass: segment_klass, element: device_description, created_by: user.id,
                         properties: segment_klass.properties_release.except('klass_uuid'),
                         klass_uuid: 'imported-release', properties_release: imported_release)
      end

      it 'keeps that release on the split' do
        post '/api/v1/device_descriptions/sub_device_descriptions/', params: params, as: :json

        split_segment = device_description.reload.children.first.segments.first
        expect(split_segment.klass_uuid).to eq('imported-release')
        expect(split_segment.properties_release['uuid']).to eq('imported-release')
      end
    end

    context 'when copying a segment fails' do
      let(:params) do
        {
          ui_state: {
            currentCollectionId: collection.id,
            device_description: {
              all: false,
              included_ids: [device_description.id, device_description2.id],
              excluded_ids: [],
            },
          },
        }
      end

      before do
        create(:collections_device_description, device_description: device_description2, collection: collection)
        create(:segment, segment_klass: segment_klass, element: device_description2, created_by: user.id,
                         properties: nil)
      end

      it 'creates no split for any of the selected device descriptions' do
        expect { post '/api/v1/device_descriptions/sub_device_descriptions/', params: params, as: :json }
          .to raise_error(NoMethodError)
        expect(DeviceDescription.where(id: [device_description.id, device_description2.id])
          .flat_map(&:children)).to be_empty
      end
    end

    context 'when the collection is a read-only share' do
      let(:read_only_collection) do
        create(:collection, user: create(:person)).tap do |c|
          create(:collection_share, collection: c, shared_with: user,
                                    permission_level: CollectionShare::PERMISSION_LEVELS[:read_elements])
        end
      end
      let(:shared_device_description) do
        create(:device_description, :with_ontologies, creator: read_only_collection.user)
      end
      let(:params) do
        {
          ui_state: {
            currentCollectionId: read_only_collection.id,
            device_description: {
              all: false,
              included_ids: [shared_device_description.id],
              excluded_ids: [],
            },
          },
        }
      end

      before do
        create(:collections_device_description,
               device_description: shared_device_description, collection: read_only_collection)
      end

      it 'is rejected as unauthorized and creates no sub device description' do
        post '/api/v1/device_descriptions/sub_device_descriptions/', params: params, as: :json

        expect(response).to have_http_status :unauthorized
        expect(shared_device_description.reload.children).to be_empty
      end
    end
  end

  describe 'PUT /api/v1/device_descriptions/:id' do
    context 'when updating an device description' do
      let(:params) do
        {
          name: 'new name',
          short_label: 'CU1-DD1-2',
        }
      end

      it 'returns the updated device description' do
        put "/api/v1/device_descriptions/#{device_description.id}", params: device_description.attributes.merge(params)

        expect(parsed_json_response['device_description']).to include(params.stringify_keys)
      end
    end
  end

  describe 'DELETE /api/v1/device_descriptions/:id' do
    it 'deletes a device description' do
      delete "/api/v1/device_descriptions/#{device_description.id}"

      expect(parsed_json_response).to include('deleted' => device_description.id)
    end
  end
end
