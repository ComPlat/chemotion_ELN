# frozen_string_literal: true

require 'rails_helper'

# rubocop:disable RSpec/NestedGroups
describe Labimotion::GenericElementAPI do
  context 'with authorized user' do
    let(:user) { create(:person) }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    end

    describe 'GET /api/v1/generic_elements/' do
      it 'returns an object with generic_elements' do
        get '/api/v1/generic_elements/'
        body = JSON.parse(response.body)

        expect(body['generic_elements']).to be_an(Array)
      end

      context 'with sort_column' do
        let(:collection) { create(:collection, user: user, is_shared: false) }
        let(:element_klass) { create(:element_klass) }
        let(:element1) do
          properties = element_klass.properties_release
          properties['layers']['gen']['fields'][0]['value'] = nil # type field
          properties['layers']['gen']['fields'][1]['value'] = 'a' # class field
          properties['layers']['gen']['fields'][2]['value'] = 'b' # mode field

          create(
            :element,
            element_klass: element_klass,
            properties: properties,
            creator: user,
            updated_at: Time.current,
            collections: [collection],
          )
        end
        let(:element2) do
          properties = element_klass.properties_release
          properties['layers']['gen']['fields'][0]['value'] = 'c' # type field
          properties['layers']['gen']['fields'][1]['value'] = nil # class field
          properties['layers']['gen']['fields'][2]['value'] = 'a' # mode field

          create(
            :element,
            element_klass: element_klass,
            properties: properties,
            creator: user,
            updated_at: 1.minute.ago,
            collections: [collection],
          )
        end
        let(:element3) do
          properties = element_klass.properties_release
          properties['layers']['gen']['fields'][0]['value'] = 'b' # type field
          properties['layers']['gen']['fields'][1]['value'] = 'c' # class field
          properties['layers']['gen']['fields'][2]['value'] = nil # mode field

          create(
            :element,
            element_klass: element_klass,
            properties: properties,
            creator: user,
            updated_at: 1.minute.from_now,
            collections: [collection],
          )
        end

        before do
          element1
          element2
          element3
        end

        it 'returns sorted elements per default by updated_at' do
          get '/api/v1/generic_elements', params: { collection_id: collection.id, el_type: element_klass.name }

          expect(JSON.parse(response.body)['generic_elements'].pluck('id')).to eq(
            [
              element3.id,
              element1.id,
              element2.id,
            ],
          )
        end

        it 'returns sorted elements by gen.type' do
          get '/api/v1/generic_elements', params: {
            collection_id: collection.id,
            el_type: element_klass.name,
            sort_column: 'gen.type',
          }

          expect(JSON.parse(response.body)['generic_elements'].pluck('id')).to eq(
            [
              element1.id, # null first
              element3.id, # b
              element2.id, # c
            ],
          )
        end

        it 'returns sorted elements by gen.class' do
          get '/api/v1/generic_elements', params: {
            collection_id: collection.id,
            el_type: element_klass.name,
            sort_column: 'gen.class',
          }

          expect(JSON.parse(response.body)['generic_elements'].pluck('id')).to eq(
            [
              element2.id, # null first
              element1.id, # a
              element3.id, # b
            ],
          )
        end

        it 'returns sorted elements by gen.mode' do
          get '/api/v1/generic_elements', params: {
            collection_id: collection.id,
            el_type: element_klass.name,
            sort_column: 'gen.mode',
          }

          expect(JSON.parse(response.body)['generic_elements'].pluck('id')).to eq(
            [
              element3.id, # null first
              element2.id, # a
              element1.id, # b
            ],
          )
        end

        it 'returns sorted elements by updated_at for missing field' do
          get '/api/v1/generic_elements', params: {
            collection_id: collection.id,
            el_type: element_klass.name,
            sort_column: 'gen.missing_key',
          }

          expect(JSON.parse(response.body)['generic_elements'].pluck('id')).to eq(
            [
              element3.id,
              element1.id,
              element2.id,
            ],
          )
        end
      end
    end
  end
end
# rubocop:enable RSpec/NestedGroups
