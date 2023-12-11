# frozen_string_literal: true

RSpec.describe Usecases::ReactionProcessEditor::ReactionProcessActivities::UpdateWorkup do
  subject(:usecase) { described_class.execute!(activity: activity, workup: workup) }

  let(:activity) { create(:reaction_process_activity) }
  let(:workup) { { NEW_WORKUP: 'SUCCESS' }.deep_stringify_keys }

  it 'updates activity' do
    expect { usecase }.to change(activity, :workup).to(workup)
  end

  it 'returns activity' do
    expect(usecase).to eq activity
  end

  context 'when SAVE' do
    let(:activity) { build(:reaction_process_activity, activity_name: 'SAVE') }
    let(:created_sample) { Sample.order(:updated_at).last }

    it 'creates Sample' do
      expect { usecase }.to change(Sample, :count).by(1)
    end

    it 'sets workup sample_id' do
      expect { usecase }.to change { activity.workup['sample_id'] }.from(nil)
    end
  end
end
