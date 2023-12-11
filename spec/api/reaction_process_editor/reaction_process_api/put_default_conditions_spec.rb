# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::ReactionProcessAPI, '.put default_conditions' do
  include RequestSpecHelper

  subject(:api_call) do
    put("/api/v1/reaction_process_editor/reaction_processes/#{reaction_process.id}/reaction_default_conditions",
        headers: authorization_header,
        params: { default_conditions: default_conditions_params }.to_json)
  end

  let!(:reaction_process) { create(:reaction_process) }
  let(:authorization_header) { authorized_header(reaction_process.creator) }

  let(:default_conditions_params) do
    { TEMPERATURE: { value: '2000', unit: 'KELVIN' },
      PRESSURE: { value: '90', unit: 'BAR' },
      PH: { value: '1.4142', unit: 'PH' } }.deep_stringify_keys
  end

  it_behaves_like 'authorization restricted API call'

  context 'when authorized' do
    it 'responds 200' do
      api_call
      expect(response).to have_http_status :ok
    end

    it 'updates user default_conditions' do
      expect do
        api_call
      end.to change { reaction_process.reload&.default_conditions }.to(default_conditions_params)
    end

    context 'when unauthorized' do
      it 'responds 401' do
        get('/api/v1/reaction_process_editor/collection_select_options')
        expect(response).to have_http_status :unauthorized
      end
    end
  end
end
