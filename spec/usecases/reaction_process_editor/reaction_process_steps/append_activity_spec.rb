# frozen_string_literal: true

RSpec.describe Usecases::ReactionProcessEditor::ReactionProcessSteps::AppendActivity do
  subject(:append_activity) do
    described_class.execute!(reaction_process_step: process_step,
                             activity_params: activity_params,
                             position: insert_before)
  end

  let!(:process_step) { create_default(:reaction_process_step) }
  let!(:existing_actions) { create_list(:reaction_process_activity, 3) }
  let(:insert_before) { nil }

  let(:activity_params) do
    { activity_name: 'ADD', workup: { SOME: 'WORKUP' } }.deep_stringify_keys
  end

  let(:created_action) { ReactionProcessEditor::ReactionProcess.order(:crated_at).last }

  it 'adds action' do
    expect { append_activity }.to change(process_step.reaction_process_activities, :length).by(1)
  end

  it 'returns action' do
    expect(append_activity.attributes).to include(activity_params)
  end

  it 'appends on last position' do
    expect(append_activity.position).to eq existing_actions.length
  end

  it 'triggers ReactionProcessActivities::Update' do
    allow(Usecases::ReactionProcessEditor::ReactionProcessActivities::Update).to receive(:execute!)

    append_activity

    expect(Usecases::ReactionProcessEditor::ReactionProcessActivities::Update).to have_received(:execute!).with(
      activity: instance_of(ReactionProcessEditor::ReactionProcessActivity),
      activity_params: activity_params,
    )
  end

  describe 'action TRANSFER' do
    let(:insert_before) { 1 }
    let(:target_step) { create(:reaction_process_step, reaction_process: process_step.reaction_process) }

    context 'when created from Source Step' do
      let(:activity_params) do
        { activity_name: 'TRANSFER', workup: { transfer_target_step_id: target_step.id } }.deep_stringify_keys
      end

      it 'creates action in Target Step' do
        expect(append_activity.reaction_process_step).to eq target_step
      end

      it 'appends action last in Target Step' do
        create(:reaction_process_activity, reaction_process_step: target_step)
        create(:reaction_process_activity, reaction_process_step: target_step)
        expect(append_activity.position).to eq 2
      end

      it 'creates no action in Transfer Source Step' do
        expect { append_activity }.not_to(change { process_step.reaction_process_activities.length })
      end
    end

    context 'when created from Target Step' do
      let(:activity_params) do
        { activity_name: 'TRANSFER', workup: { transfer_target_step_id: process_step.id } }.deep_stringify_keys
      end

      it 'respects position' do
        expect(append_activity.position).to eq 1
      end
    end
  end

  context 'with insert_before' do
    let(:insert_before) { 1 }

    it 'reflects insert' do
      expect(append_activity.position).to eq insert_before
    end

    it 'triggers ReactionProcessActivities::UpdatePosition' do
      allow(Usecases::ReactionProcessEditor::ReactionProcessActivities::UpdatePosition).to receive(:execute!)

      append_activity

      expect(
        Usecases::ReactionProcessEditor::ReactionProcessActivities::UpdatePosition,
      ).to have_received(:execute!).with(
        activity: instance_of(ReactionProcessEditor::ReactionProcessActivity),
        position: insert_before,
      )
    end
  end

  context 'with insert out of bounds' do
    let(:insert_before) { 100 }

    it 'appends on last position' do
      expect(append_activity.position).to eq existing_actions.length
    end
  end
end
