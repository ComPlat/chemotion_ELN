# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::TextTemplateAPI do
  include_context 'api request authorization context'

  describe 'GET /api/v1/text_templates/by_type?type=:type' do
    let(:url) { "/api/v1/text_templates/by_type?type=#{type}" }

    context 'when requested type is a default element type' do
      let(:type) { 'wellplate' }
      let(:expected_output) do
        { 'wellplate' => user.wellplate_text_template.data }
      end

      it 'returns the data field of the current users template of this type' do
        get url

        expect(parsed_json_response).to eq expected_output
      end
    end

    context 'when requested type is not a default element type' do
      let(:type) { 'Foobar' }
      let(:element_text_template) { create(:element_text_template, user: user, name: type) }
      let(:expected_output) do
        { 'Foobar' => element_text_template.data }
      end

      before { element_text_template }

      it 'returns the current users ElementTextTemplate with name = type' do
        get url

        expect(parsed_json_response).to eq expected_output
      end
    end
  end

  describe 'PUT /api/v1/text_templates/update' do
    let(:url) { '/api/v1/text_templates/update' }

    context 'when type is a default element type' do
      let(:type) { 'wellplate' }
      let(:input) do
        {
          type: type,
          data: { foo: :bar }
        }
      end
      let(:expected_output) do
        Entities::TextTemplateEntity.represent(user.wellplate_text_template).serializable_hash.deep_stringify_keys
      end

      it 'updates the current users template of that type' do
        put url, params: input

        expect(parsed_json_response).to eq expected_output
        expect(user.wellplate_text_template.data).to eq('foo' => 'bar')
      end
    end

    context 'when type is not a default element type' do
      let(:type) { 'Foobar' }
      let(:input) do
        {
          type: type,
          data: { bar: :baz }
        }
      end
      let(:element_text_template) { create(:element_text_template, user: user, name: type) }
      let(:expected_output) do
        Entities::TextTemplateEntity
          .represent(ElementTextTemplate.find_by(user: user, name: type))
          .serializable_hash.deep_stringify_keys
      end

      before { element_text_template }

      it 'updates or creates the current users ElementTextTemplate with name = type' do
        put url, params: input

        expect(parsed_json_response).to eq expected_output
      end
    end
  end

  describe 'GET /api/v1/text_templates/predefinedNames' do
    let(:url) { '/api/v1/text_templates/predefinedNames' }
    let(:expected_output) { { 'text_templates' => PredefinedTextTemplate.order(id: :desc).pluck(:name) } }

    before { create_list(:predefined_text_template, 3) }

    it 'returns the names of all predefined text templates' do
      get url

      expect(parsed_json_response).to eq expected_output
    end
  end

  describe 'GET /api/v1/text_templates/by_name' do
    let(:name) { 'Foobar' }
    let(:url) { "/api/v1/text_templates/by_name?name=#{name}" }
    let(:template) { create(:predefined_text_template, name: name, user: user) }
    let(:expected_output) do
      { 'text_templates' => [Entities::TextTemplateEntity.represent(template).serializable_hash.deep_stringify_keys] }
    end

    before { template }

    it 'returns the PredefinedTextTemplates with that name' do
      get url

      expect(parsed_json_response).to eq expected_output
    end
  end

  describe 'DELETE /api/v1/text_templates/by_name' do
    let(:name) { 'Foobar' }
    let(:url) { "/api/v1/text_templates/by_name?name=#{name}" }
    let(:template) { create(:predefined_text_template, name: name, user: user) }
    let(:expected_output) do
      Entities::TextTemplateEntity.represent(template).serializable_hash.deep_stringify_keys
    end

    before { template }

    context 'when curent user is no admin' do
      it 'returns a 401' do
        delete url

        expect(parsed_json_response).to eq('error' => '401 Unauthorized')
      end
    end

    context 'when no PredefinedTextTemplate with that name exists' do
      let(:user) { create(:admin) }
      let(:url) { '/api/v1/text_templates/by_name?name=SomethingThatDoesNotExist' }

      it 'returns a 404' do
        delete url

        expect(parsed_json_response).to eq('error' => '404 Not found')
      end
    end

    context 'when current user is an admin and the template exists' do
      let(:user) { create(:admin) }

      it 'deletes the PredefinedTextTemplate of that name' do
        delete url

        expect(parsed_json_response).to eq expected_output
        expect(PredefinedTextTemplate.where(id: template.id).exists?).to be false
      end
    end
  end

  describe 'PUT /api/v1/text_templates/predefined_text_template' do
    let(:name) { 'Foobar' }
    let(:template) { create(:predefined_text_template, name: name, user: user, data: { foo: :bar }) }
    let(:url) { '/api/v1/text_templates/predefined_text_template' }
    let(:input) do
      {
        id: template.id,
        name: new_name,
        data: new_data
      }
    end
    let(:new_name) { 'Barbaz' }
    let(:new_data) { { bar: :baz } }

    context 'when current user is not an admin' do
      it 'returns a 401' do
        put url, params: input

        expect(parsed_json_response).to eq('error' => '401 Unauthorized')
      end
    end

    context 'when no PredefinedTextTemplate of that id exists' do
      let(:user) { create(:admin) }

      it 'returns a 404' do
        put url, params: input.merge(id: template.id + 9999)

        expect(parsed_json_response).to eq('error' => '404 Not found')
      end
    end

    context 'when user is admin and the template exists' do
      let(:user) { create(:admin) }
      let(:expected_output) do
        Entities::TextTemplateEntity.represent(template.reload).serializable_hash.deep_stringify_keys
      end

      it 'updates the PredefinedTextTemplate found by id' do
        put url, params: input

        expect(parsed_json_response).to eq expected_output
      end
    end
  end

  describe 'POST /api/v1/text_templates/predefined_text_template' do
    let(:name) { 'Foobar' }
    let(:url) { '/api/v1/text_templates/predefined_text_template' }
    let(:data) { { bar: :baz } }
    let(:input) do
      {
        name: name,
        data: data
      }
    end

    context 'when current user is not an admin' do
      it 'returns a 401' do
        post url, params: input

        expect(parsed_json_response).to eq('error' => '401 Unauthorized')
      end
    end

    context 'when current user is an admin' do
      let(:user) { create(:admin) }
      let(:expected_output) do
        template = PredefinedTextTemplate.find_by(name: name, user_id: user.id)

        Entities::TextTemplateEntity.represent(template).serializable_hash.deep_stringify_keys
      end

      it 'creates a PredefinedTextTemplate with the supplied data' do
        post url, params: input

        expect(parsed_json_response).to eq expected_output
      end
    end
  end
end
