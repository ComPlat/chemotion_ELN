# frozen_string_literal: true

RSpec.describe Usecases::ReactionProcessEditor::ReactionProcessSteps::UpdatePosition do
  subject(:update_position) do
    described_class.execute!(reaction_process_step: moving_step, position: new_position)
  end

  let!(:reaction_process) { create_default(:reaction_process) }
  let!(:existing_steps) { create_list(:reaction_process_step, 3) }

  let!(:moving_step) { create(:reaction_process_step) }
  let(:new_position) { 1 }

  it 'reorders reaction_process_steps' do
    expect { update_position }.to change { reaction_process.reaction_process_steps.order(:position) }.from(
      existing_steps + [moving_step],
    ).to(
      [existing_steps[0], moving_step, existing_steps[1], existing_steps[2]],
    )
  end

  it 'updates reaction_process_step position' do
    expect { update_position }.to change(moving_step, :position).from(3).to(1)
  end

  it 'updates siblings positions' do
    expect { update_position }.to change { existing_steps.each(&:reload).map(&:position) }
      .from([0, 1, 2])
      .to([0, 2, 3])
  end

  context 'with new position out of bounds' do
    let(:new_position) { 100 }

    it 'appends on last position' do
      expect { update_position }.not_to(
        change { reaction_process.reaction_process_steps.order(:position).map(&:id) },
      )
    end
  end
end
