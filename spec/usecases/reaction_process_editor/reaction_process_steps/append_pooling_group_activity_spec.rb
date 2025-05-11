# frozen_string_literal: true

RSpec.describe Usecases::ReactionProcessEditor::ReactionProcessSteps::AppendPoolingGroupActivity do
  subject(:append_activity) do
    described_class.execute!(reaction_process_step: process_step,
                             pooling_group_params: pooling_group_params,
                             position: insert_before)
  end

  let!(:process_step) { create_default(:reaction_process_step) }
  # rubocop:disable RSpec/LetSetup
  let!(:existing_actions) { create_list(:reaction_process_activity, 3) }
  # rubocop:enable RSpec/LetSetup
  let(:insert_before) { 2 }
  let(:vials_params) { [{ id: 1 }, { id: 2 }, { id: 3 }] }

  let(:vessel) { create(:vessel) }
  let(:vessel_params) { { vesselable_id: vessel.id, vesselable_type: vessel.class.to_s } }

  let(:pooling_group_params) do
    { followup_action: { value: 'DISCARD' },
      workup: { SOME: 'WORKUP' },
      vessel: vessel_params,
      vials: vials_params }.deep_stringify_keys
  end

  let(:created_action) { ReactionProcessEditor::ReactionProcessActivity.order(:created_at).last }

  it 'adds action' do
    expect { append_activity }.to change(process_step.reaction_process_activities, :length).by(1)
  end

  it 'sets action name' do
    append_activity
    expect(created_action.activity_name).to eq 'DISCARD'
  end

  it 'sets fractions' do
    append_activity
    expect(created_action.workup['fractions']).to eq [1, 2, 3]
  end

  it 'sets vessel' do
    append_activity
    expect(created_action.reaction_process_vessel.vesselable).to eq vessel
  end

  it 'appends after parent activity' do
    expect(append_activity.position).to eq 2
  end

  context 'when followup_action SAVE' do
    let(:pooling_group_params) do
      { followup_action: { value: 'SAVE' },
        workup: {},
        vessel: vessel_params,
        vials: vials_params }.deep_stringify_keys
    end

    it 'invokes SaveIntermediate' do
      allow(Usecases::ReactionProcessEditor::ReactionProcessActivities::SaveIntermediate).to receive(:execute!)

      append_activity

      expect(Usecases::ReactionProcessEditor::ReactionProcessActivities::SaveIntermediate).to have_received(:execute!)
        .with(activity: instance_of(ReactionProcessEditor::ReactionProcessActivity), workup: {})
    end
  end
end
