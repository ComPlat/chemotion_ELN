# frozen_string_literal: true

RSpec.describe Usecases::ReactionProcessEditor::ReactionProcessActivities::SaveIntermediate do
  subject(:usecase) { described_class.execute!(activity: activity, workup: workup) }

  let(:amount) { { target_amount: { value: '314', unit: 'mcg' } }.deep_stringify_keys }

  before do
    create_default :reaction_process_step
  end

  context 'when Sample is new' do
    let!(:activity) { build(:reaction_process_activity, activity_name: 'SAVE') }
    let(:workup) { amount }

    it 'creates Sample' do
      expect { usecase }.to change(Sample, :count).by(1)
    end

    it 'sets workup sample_id' do
      expect { usecase }.to change { activity.workup['sample_id'] }.from(nil)
    end
  end

  context 'when Sample persisted' do
    let!(:activity) { create(:reaction_process_activity_save) }
    let(:workup) { amount.merge({ sample_id: activity.workup['sample_id'] }).deep_stringify_keys }

    let(:saved_sample) { Sample.find(activity.workup['sample_id']) }

    it 'creates no new Sample' do
      expect { usecase }.not_to change(Sample, :count)
    end

    it 'converts Sample amount' do
      expect { usecase }.to change {
        saved_sample.reload.target_amount_value
      }.to(314.0 * (10**-6))
    end

    it 'calculates Sample metrics' do
      expect { usecase }.to change {
        saved_sample.reload.metrics
      }.to('ummm')
    end

    it 'retains workup sample_id' do
      expect { usecase }.not_to(change { activity.workup['sample_id'] })
    end
  end
end
