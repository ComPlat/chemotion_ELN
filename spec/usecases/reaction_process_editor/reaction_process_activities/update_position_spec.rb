# frozen_string_literal: true

RSpec.describe Usecases::ReactionProcessEditor::ReactionProcessActivities::UpdatePosition do
  subject(:update_position) do
    described_class.execute!(activity: moving_activity, position: new_position)
  end

  let!(:process_step) { create_default(:reaction_process_step) }
  let!(:existing_activities) { create_list(:reaction_process_activity, 3) }

  let!(:moving_activity) { create(:reaction_process_activity) }
  let(:new_position) { 1 }

  it 'reorders Activities' do
    expect { update_position }.to change { process_step.reaction_process_activities.order(:position) }.from(
      existing_activities + [moving_activity],
    ).to(
      [existing_activities[0], moving_activity, existing_activities[1], existing_activities[2]],
    )
  end

  it 'updates moving_activity position' do
    expect { update_position }.to change(moving_activity, :position).from(3).to(1)
  end

  it 'updates siblings positions' do
    expect { update_position }.to change { existing_activities.each(&:reload).map(&:position) }
      .from([0, 1, 2])
      .to([0, 2, 3])
  end

  context 'with new position out of bounds' do
    let(:new_position) { 100 }

    it 'appends on last position' do
      expect { update_position }.not_to(
        change { process_step.reaction_process_activities.order(:position).map(&:id) },
      )
    end
  end
end
