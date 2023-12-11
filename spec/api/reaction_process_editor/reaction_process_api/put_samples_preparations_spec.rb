# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::ReactionProcessAPI, '.put /samples_preparations' do
  include RequestSpecHelper

  subject(:put_sample_preparation_request) do
    put("/api/v1/reaction_process_editor/reaction_processes/#{reaction_process.id}/samples_preparations",
        headers: authorization_header,
        params: { sample_preparation: sample_preparation_params }.to_json)
  end

  let!(:reaction_process) { create_default(:reaction_process) }
  let!(:sample_id) { create(:sample).id.to_s }

  let(:sample_preparation_params) do
    { id: sample_preparation_id,
      sample_id: sample_id,
      preparations: ['HOMOGENIZED'],
      sample: { id: sample_id } }.deep_stringify_keys
  end
  let(:sample_preparation_id) { nil }

  let(:expected_preparations_usecase_params) do
    # client params may contain `sample` hash, potentially interfering with ActiveRelation.
    sample_preparation_params.except('id', 'sample')
  end

  let(:authorization_header) { authorized_header(reaction_process.creator) }

  it_behaves_like 'authorization restricted API call'

  context 'with new sample_preparation' do
    let(:sample_preparation_id) { nil }

    it 'triggers usecase SamplesPreparation::FindOrCreate' do
      allow(Usecases::ReactionProcessEditor::SamplesPreparations::FindOrCreate).to receive(:execute!)

      put_sample_preparation_request

      expect(Usecases::ReactionProcessEditor::SamplesPreparations::FindOrCreate).to have_received(:execute!).with(
        reaction_process: reaction_process, sample_preparation: expected_preparations_usecase_params,
      )
    end

    it 'creates SamplesPreparation' do
      expect { put_sample_preparation_request }.to change {
                                                     reaction_process.reload.samples_preparations.length
                                                   }.by(1)
    end
  end

  context 'with new sample_preparation on already prepared sample' do
    # Edge case when a Sample already has a sample_preparation but the request misses `sample_preparation_id`
    # (considered a client side bug). We need to identify and update the sample_preparation anyway.
    let!(:sample_preparation) { create(:samples_preparation, sample_id: sample_id) }
    let(:sample_preparation_id) { nil }

    it 'keeps samples_preparation' do
      expect { put_sample_preparation_request }.not_to(change { reaction_process.reload.samples_preparations.length })
    end

    it 'updates samples_preparation' do
      expect do
        put_sample_preparation_request
      end.to change { sample_preparation.reload.attributes }
        .to(hash_including({ preparations: ['HOMOGENIZED'] }.stringify_keys))
    end
  end

  context 'with existing sample_preparation' do
    let!(:sample_preparation) { create(:samples_preparation, sample_id: sample_id) }
    let(:sample_preparation_id) { sample_preparation.id }

    it 'triggers usecase SamplesPreparation::FindOrCreate' do
      allow(Usecases::ReactionProcessEditor::SamplesPreparations::FindOrCreate).to receive(:execute!)

      put_sample_preparation_request

      expect(Usecases::ReactionProcessEditor::SamplesPreparations::FindOrCreate).to have_received(:execute!).with(
        reaction_process: reaction_process, sample_preparation: expected_preparations_usecase_params,
      )
    end

    it 'keeps SamplesPreparation' do
      expect { put_sample_preparation_request }.not_to(change { reaction_process.reload.samples_preparations.length })
    end
  end
end
