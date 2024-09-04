# frozen_string_literal: true

RSpec.describe Usecases::ReactionProcessEditor::ReactionProcessActivities::Destroy do
  subject(:destroy_activity) do
    described_class.execute!(activity: deleting_activity)
  end

  let!(:process_step) { create_default(:reaction_process_step) }
  let!(:existing_activities) { create_list(:reaction_process_activity, 4) }
  let!(:deleting_activity) { existing_activities[2] }

  it 'deletes action' do
    expect { destroy_activity }.to change {
                                     ReactionProcessEditor::ReactionProcessActivity.exists?(deleting_activity.id)
                                   }.to(false)
  end

  it 'updates siblings positions' do
    expect { destroy_activity }.to change {
                                     process_step.reload.reaction_process_activities.order(:position).map(&:position)
                                   }
      .from((0..3).to_a)
      .to((0..2).to_a)
  end

  it 'reorders siblings' do
    expect { destroy_activity }.to change { process_step.reload.reaction_process_activities.order(:position) }.from(
      existing_activities,
    ).to(
      [existing_activities[0], existing_activities[1], existing_activities[3]],
    )
  end
end
