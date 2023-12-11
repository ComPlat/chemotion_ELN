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

    it 'creates no Sample' do
      expect { usecase }.not_to change(Sample, :count)
    end

    it 'updates Sample amount' do
      expect { usecase }.to change { Sample.find(activity.workup['sample_id']).target_amount_value }.to(314.0)
    end

    it 'retains workup sample_id' do
      expect { usecase }.not_to(change { activity.workup['sample_id'] })
    end
  end
end
