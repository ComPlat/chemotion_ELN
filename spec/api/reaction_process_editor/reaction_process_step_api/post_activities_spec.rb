# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::ReactionProcessStepAPI, '.post /activities' do
  include RequestSpecHelper

  subject(:post_action_request) do
    post("/api/v1/reaction_process_editor/reaction_process_steps/#{reaction_process_step.id}/activities",
         params: create_activity_params.to_json,
         headers: authorization_header)
  end

  let!(:reaction_process_step) { create_default(:reaction_process_step) }
  let(:insert_before) { 2 }
  let!(:expected_create_action_hash) do
    { 'reaction_process_activity' => hash_including({
                                                      'activity_name' => 'ADD',
                                                      'position' => anything,
                                                      'workup' => hash_including({
                                                                                   'acts_as' => 'SAMPLE',
                                                                                   'sample_id' => sample.id.to_s,
                                                                                 }),
                                                    }) }
  end
  let(:create_activity_params) do
    { activity:
          { activity_name: 'ADD',
            workup: {
              acts_as: 'SAMPLE',
              sample_id: sample.id.to_s,
            } },
      insert_before: insert_before }.deep_stringify_keys
  end
  let!(:sample) { create(:valid_sample, reaction: reaction_process_step.reaction) }

  let(:created_action) { ReactionProcessEditor::ReactionProcessActivity.order(:created_at).last }

  let(:authorization_header) { authorized_header(reaction_process_step.creator) }

  it_behaves_like 'authorization restricted API call'

  it 'triggers UseCase ReactionProcessSteps::AppendActivity' do
    allow(Usecases::ReactionProcessEditor::ReactionProcessSteps::AppendActivity).to receive(:execute!).and_call_original

    post_action_request

    expect(Usecases::ReactionProcessEditor::ReactionProcessSteps::AppendActivity).to have_received(:execute!).with(
      reaction_process_step: reaction_process_step,
      activity_params: create_activity_params['activity'],
      position: insert_before,
    )
  end

  it 'returns created action' do
    post_action_request
    expect(parsed_json_response).to include(expected_create_action_hash)
  end

  describe 'creating "TRANSFER"' do
    let!(:source_step) do
      create(:reaction_process_step, name: 'The Source Step', reaction_process: reaction_process_step.reaction_process)
    end
    let!(:action_save) { create(:reaction_process_activity_save, reaction_process_step: source_step) }
    let(:create_activity_params) do
      { activity:
       { activity_name: 'TRANSFER',
         workup: {
           source_step_id: source_step.id,
           target_step_id: reaction_process_step.id,
           sample_id: action_save.workup['sample_id'],
           intermediate_type: 'CRUDE',
         } } }
    end

    before do
      post_action_request
    end

    it 'returns transfer_source_step_name' do
      expect(parsed_json_response['reaction_process_activity']).to include(
        { transfer_source_step_name: 'The Source Step' }.stringify_keys,
      )
    end
  end

  context 'with invalid action data' do
    let(:create_activity_params) do
      # Invalid: requires workup
      { activity: { activity_name: 'ADD' } }
    end

    it 'returns 422' do
      post_action_request
      expect(response).to have_http_status(:bad_request)
    end
  end
end
