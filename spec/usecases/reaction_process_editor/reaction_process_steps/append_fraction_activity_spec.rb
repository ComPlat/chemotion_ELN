# frozen_string_literal: true

RSpec.describe Usecases::ReactionProcessEditor::ReactionProcessSteps::AppendFractionActivity do
  subject(:append_activity) do
    described_class.execute!(parent_activity: existing_actions.first,
                             fraction_params: fraction_params,
                             index: 1)
  end

  let!(:process_step) { create_default(:reaction_process_step) }

  let!(:existing_actions) { create_list(:reaction_process_activity, 3) }

  let(:insert_before) { 2 }

  let(:vessel) { create(:vessel) }
  let(:vessel_params) { { vesselable_id: vessel.id, vesselable_type: vessel.class.to_s } }

  let(:fraction_params) do
    { consuming_activity_name: 'DISCARD',
      vessel: vessel_params,
      vials: %w[1 2 3] }.deep_stringify_keys
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
    expect(created_action.consumed_fraction.vials).to eq %w[1 2 3]
  end

  it 'sets vessel' do
    append_activity
    expect(created_action.reaction_process_vessel.vesselable).to eq vessel
  end

  it 'appends after parent activity' do
    expect(append_activity.position).to eq 2
  end

  context 'when consuming_activity is SAVE' do
    let(:fraction_params) do
      { consuming_activity_name: 'SAVE',
        workup: {},
        vessel: vessel_params,
        vials: %w[1 2 3] }.deep_stringify_keys
    end

    it 'invokes SaveIntermediate' do
      allow(Usecases::ReactionProcessEditor::ReactionProcessActivities::SaveIntermediate).to receive(:execute!)

      append_activity

      expect(Usecases::ReactionProcessEditor::ReactionProcessActivities::SaveIntermediate).to have_received(:execute!)
        .with(activity: instance_of(ReactionProcessEditor::ReactionProcessActivity), workup: {})
    end
  end
end
