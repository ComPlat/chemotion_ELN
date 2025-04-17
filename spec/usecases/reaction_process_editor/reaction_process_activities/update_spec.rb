# frozen_string_literal: true

RSpec.describe Usecases::ReactionProcessEditor::ReactionProcessActivities::Update do
  subject(:update_activity) { described_class.execute!(activity: activity, activity_params: activity_params) }

  let!(:reaction_process) { create_default :reaction_process }
  let(:activity) { create(:reaction_process_activity) }
  let(:activity_params) { { workup: { NEW_WORKUP: 'SUCCESS' } }.deep_stringify_keys }

  it 'updates activity' do
    expect { update_activity }.to change(activity, :workup).to(activity_params['workup'])
  end

  it 'returns activity' do
    expect(update_activity).to eq activity
  end

  context 'when SAVE' do
    let(:activity) { build(:reaction_process_activity, activity_name: 'SAVE') }
    let(:created_sample) { Sample.order(:updated_at).last }

    it 'creates Sample' do
      expect { update_activity }.to change(Sample, :count).by(1)
    end

    it 'sets workup sample_id' do
      expect { update_activity }.to change { activity.workup['sample_id'] }.from(nil)
    end
  end

  context 'with vessel params' do
    let(:vessel) { create(:vessel) }
    let(:activity_params) do
      { activity_name: 'ADD',
        workup: { SOME: 'WORKUP' },
        reaction_process_vessel: { vessel_id: vessel.id } }.deep_stringify_keys
    end

    it 'triggers ReactionProcessVessel::CreateOrUpdate' do
      allow(Usecases::ReactionProcessEditor::ReactionProcessVessels::CreateOrUpdate).to receive(:execute!)

      update_activity

      expect(Usecases::ReactionProcessEditor::ReactionProcessVessels::CreateOrUpdate)
        .to have_received(:execute!).with(
          reaction_process_id: reaction_process.id,
          reaction_process_vessel_params: { vessel_id: vessel.id }.deep_stringify_keys,
        )
    end

    it 'triggers ReactionProcessVessel::SweepUnused' do
      allow(Usecases::ReactionProcessEditor::ReactionProcessVessels::SweepUnused).to receive(:execute!)

      update_activity

      expect(Usecases::ReactionProcessEditor::ReactionProcessVessels::SweepUnused).to have_received(:execute!).with(
        reaction_process_id: reaction_process.id,
      )
    end
  end
end
