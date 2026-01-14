# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::EditorAPI, '.put /user_default_conditions' do
  include RequestSpecHelper

  subject(:api_call) do
    put('/api/v1/reaction_process_editor/user_default_conditions',
        headers: authorization_header,
        params: { default_conditions: user_default_conditions_params }.to_json)
  end

  let!(:creator) { create(:person) }
  let(:authorization_header) { authorized_header(creator) }

  let(:user_default_conditions_params) do
    { TEMPERATURE: { value: '2000', unit: 'KELVIN' },
      PRESSURE: { value: '90', unit: 'BAR' },
      PH: { value: '1.4142', unit: 'PH' } }.deep_stringify_keys
  end

  it_behaves_like 'authenticated API call'

  context 'when authorized' do
    it 'responds 204' do
      api_call
      expect(response).to have_http_status :no_content
    end

    it 'updates user default_conditions' do
      expect do
        api_call
      end.to change { creator.reload.reaction_process_defaults&.default_conditions }.to(user_default_conditions_params)
    end
  end
end
