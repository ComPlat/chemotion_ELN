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

    context 'when current user is a regular user without global_text_template_editor' do
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

    context 'when current user has global_text_template_editor privilege' do
      before do
        template
        profile = user.profile || user.create_profile
        profile.update_columns(data: (profile.data || {}).merge('global_text_template_editor' => true)) # rubocop:disable Rails/SkipsModelValidations
      end

      it 'deletes the PredefinedTextTemplate of that name' do
        delete url

        expect(parsed_json_response).to eq expected_output
        expect(PredefinedTextTemplate.exists?(id: template.id)).to be false
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

    context 'when current user is a regular user without global_text_template_editor' do
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

    context 'when user has global_text_template_editor privilege' do
      before do
        template
        profile = user.profile || user.create_profile
        profile.update_columns(data: (profile.data || {}).merge('global_text_template_editor' => true)) # rubocop:disable Rails/SkipsModelValidations
      end

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

    context 'when current user is a regular user without global_text_template_editor' do
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

    context 'when current user has global_text_template_editor privilege' do
      before do
        profile = user.profile || user.create_profile
        profile.update_columns(data: (profile.data || {}).merge('global_text_template_editor' => true)) # rubocop:disable Rails/SkipsModelValidations
      end

      let(:expected_output) do
        template = PredefinedTextTemplate.find_by(name: name, user_id: user.id)
        Entities::TextTemplateEntity.represent(template).serializable_hash.deep_stringify_keys
      end

      it 'creates a PredefinedTextTemplate with the supplied data' do
        post url, params: input

        expect(parsed_json_response).to eq expected_output
      end
    end

    context 'when a PredefinedTextTemplate with that name already exists' do
      let(:user) { create(:admin) }

      before { create(:predefined_text_template, name: name) }

      it 'returns a 422' do
        post url, params: input
        expect(response).to have_http_status(:unprocessable_entity)
      end
    end
  end

  describe 'GET /api/v1/text_templates/personal' do
    let(:url) { '/api/v1/text_templates/personal' }

    context 'when user has personal templates' do
      let!(:templates) { create_list(:personal_text_template, 3, user: user) }
      let(:expected_output) do
        {
          'text_templates' => templates.sort_by(&:id).reverse.map do |t|
            Entities::TextTemplateEntity.represent(t).serializable_hash.deep_stringify_keys
          end,
        }
      end

      it 'returns only the current users personal templates' do
        get url

        expect(parsed_json_response).to eq expected_output
      end

      it 'does not return another users templates' do
        other_template = create(:personal_text_template)
        get url

        ids = parsed_json_response['text_templates'].pluck('id')
        expect(ids).not_to include(other_template.id)
      end
    end

    context 'when user has no personal templates' do
      it 'returns an empty list' do
        get url

        expect(parsed_json_response).to eq('text_templates' => [])
      end
    end
  end

  describe 'POST /api/v1/text_templates/personal' do
    let(:url) { '/api/v1/text_templates/personal' }
    let(:input) { { name: 'My Template', data: { foo: :bar } } }

    it 'creates a personal template for the current user' do
      expect { post url, params: input }.to change(PersonalTextTemplate, :count).by(1)

      template = PersonalTextTemplate.find_by(name: 'My Template', user_id: user.id)
      expect(template).to be_present
      expect(template.data).to eq('foo' => 'bar')
    end

    it 'returns the created template' do
      post url, params: input

      template = PersonalTextTemplate.find_by(name: 'My Template', user_id: user.id)
      expected = Entities::TextTemplateEntity.represent(template).serializable_hash.deep_stringify_keys
      expect(parsed_json_response).to eq expected
    end

    context 'when name is blank' do
      it 'returns a 422' do
        post url, params: input.merge(name: '')
        expect(response).to have_http_status(:unprocessable_entity)
      end
    end

    context 'when a template with that name already exists for the user' do
      before { create(:personal_text_template, name: 'My Template', user: user) }

      it 'returns a 422' do
        post url, params: input
        expect(response).to have_http_status(:unprocessable_entity)
      end
    end
  end

  describe 'PUT /api/v1/text_templates/personal/:id' do
    let(:template) { create(:personal_text_template, user: user, name: 'Old Name', data: { a: 1 }) }
    let(:url) { "/api/v1/text_templates/personal/#{template.id}" }
    let(:input) { { id: template.id, name: 'New Name', data: { b: 2 } } }

    it 'updates the template name and data' do
      put url, params: input

      template.reload
      expect(template.name).to eq('New Name')
      expect(template.data).to eq('b' => '2')
    end

    it 'returns the updated template' do
      put url, params: input

      expected = Entities::TextTemplateEntity.represent(template.reload).serializable_hash.deep_stringify_keys
      expect(parsed_json_response).to eq expected
    end

    context 'when template belongs to another user' do
      let(:other_template) { create(:personal_text_template, name: 'Other') }
      let(:url) { "/api/v1/text_templates/personal/#{other_template.id}" }

      it 'returns a 404' do
        put url, params: input.merge(id: other_template.id)

        expect(parsed_json_response).to eq('error' => '404 Not found')
      end
    end

    context 'when template does not exist' do
      let(:url) { "/api/v1/text_templates/personal/#{template.id + 9999}" }

      it 'returns a 404' do
        put url, params: input.merge(id: template.id + 9999)

        expect(parsed_json_response).to eq('error' => '404 Not found')
      end
    end

    context 'when renaming to a name already used by another of the users templates' do
      before { create(:personal_text_template, user: user, name: 'New Name') }

      it 'returns a 422' do
        put url, params: input
        expect(response).to have_http_status(:unprocessable_entity)
      end
    end
  end

  describe 'DELETE /api/v1/text_templates/personal/:id' do
    let!(:template) { create(:personal_text_template, user: user, name: 'To Delete') }
    let(:url) { "/api/v1/text_templates/personal/#{template.id}" }

    it 'deletes the personal template' do
      expect { delete url }.to change(PersonalTextTemplate, :count).by(-1)
      expect(PersonalTextTemplate.exists?(id: template.id)).to be false
    end

    it 'returns the deleted template' do
      expected = Entities::TextTemplateEntity.represent(template).serializable_hash.deep_stringify_keys
      delete url

      expect(parsed_json_response).to eq expected
    end

    context 'when template belongs to another user' do
      let(:other_template) { create(:personal_text_template, name: 'Other') }
      let(:url) { "/api/v1/text_templates/personal/#{other_template.id}" }

      it 'returns a 404' do
        delete url

        expect(parsed_json_response).to eq('error' => '404 Not found')
      end
    end

    context 'when template does not exist' do
      let(:url) { "/api/v1/text_templates/personal/#{template.id + 9999}" }

      it 'returns a 404' do
        delete url

        expect(parsed_json_response).to eq('error' => '404 Not found')
      end
    end
  end
end
