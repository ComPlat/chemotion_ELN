# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::ReactionProcessAPI, '.get /clap' do
  include RequestSpecHelper

  subject(:api_call) do
    get("/api/v1/reaction_process_editor/reaction_processes/#{reaction_process.id}/clap",
        headers: authorization_header)
  end

  let(:reaction_process) { create(:reaction_process) }
  let(:authorization_header) { authorized_header(reaction_process.creator) }

  it 'exports clap JSON' do
    allow(Clap::Exporter::ReactionProcessExporter).to receive(:new).and_return(
      instance_double(Clap::Exporter::ReactionProcessExporter, to_clap: { id: 1 }),
    )

    api_call

    expect(response.media_type).to eq('application/json')
  end

  it 'exports clap errors as text' do
    exporter = instance_double(Clap::Exporter::ReactionProcessExporter)
    allow(exporter).to receive(:to_clap).and_raise('boom')
    allow(Clap::Exporter::ReactionProcessExporter).to receive(:new).and_return(exporter)

    api_call

    expect(response.media_type).to eq('text/plain')
  end
end
