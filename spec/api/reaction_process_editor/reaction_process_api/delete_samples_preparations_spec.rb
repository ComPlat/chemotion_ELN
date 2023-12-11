# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::ReactionProcessAPI, '.delete /samples_preparations' do
  include RequestSpecHelper

  subject(:delete_sample_preparation_request) do
    delete("/api/v1/reaction_process_editor/reaction_processes/#{reaction_process.id}" \
           "/samples_preparations/#{sample_preparation_id}",
           headers: authorization_header)
  end

  let!(:reaction_process) { create_default(:reaction_process) }

  let!(:sample_preparation) { create(:samples_preparation) }
  let(:sample_preparation_id) { sample_preparation.id.to_s }

  let(:authorization_header) { authorized_header(reaction_process.creator) }

  it_behaves_like 'authorization restricted API call'

  context 'with existing sample_preparation' do
    it 'destroys' do
      expect do
        delete_sample_preparation_request
      end.to change { ReactionProcessEditor::SamplesPreparation.exists? sample_preparation_id }.to(false)
    end
  end

  context 'with missing preparation' do
    let(:sample_preparation_id) { 'nonexistant' }

    it 'responds 404' do
      delete_sample_preparation_request
      expect(response).to have_http_status :not_found
    end
  end
end
