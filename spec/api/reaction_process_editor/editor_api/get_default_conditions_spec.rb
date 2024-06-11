# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::EditorAPI, '.get /default_conditions' do
  include RequestSpecHelper

  subject(:api_call) do
    get('/api/v1/reaction_process_editor/default_conditions',
        headers: authorization_header)
  end

  let(:creator) { create(:person) }

  let(:expected_default_conditions) do
    { default_conditions: {
      global: Entitites::ReactionProcessEditor::SelectOptions::Conditions::GLOBAL_DEFAULTS,
      user: anything,
      select_options: { activity_type_equipment: select_options::Equipment.per_activity_type,
                        condition_additional_information: select_options::Conditions.additional_information },
    } }.deep_stringify_keys
  end

  let(:authorization_header) { authorized_header(creator) }

  it_behaves_like 'authenticated API call'

  context 'when authorized' do
    it 'responds 200' do
      api_call
      expect(response).to have_http_status :ok
    end

    it 'returns default_conditions hash' do
      api_call
      expect(parsed_json_response).to include(expected_default_conditions)
    end

    context 'when unauthorized' do
      it 'responds 401' do
        get('/api/v1/reaction_process_editor/collection_select_options')
        expect(response).to have_http_status :unauthorized
      end
    end
  end
end
