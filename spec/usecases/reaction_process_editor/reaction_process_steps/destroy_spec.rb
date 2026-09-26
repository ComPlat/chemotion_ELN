# frozen_string_literal: true

RSpec.describe Usecases::ReactionProcessEditor::ReactionProcessSteps::Destroy do
  subject(:destroy_action) do
    described_class.execute!(reaction_process_step: deleting_step)
  end

  let!(:reaction_process) { create_default(:reaction_process) }
  let!(:existing_steps) { create_list(:reaction_process_step, 4) }
  let!(:deleting_step) { existing_steps[2] }

  it 'deletes reaction_process_step' do
    expect { destroy_action }.to change {
                                   ReactionProcessEditor::ReactionProcessStep.exists? deleting_step.id
                                 }.to(false)
  end

  it 'updates siblings positions' do
    expect { destroy_action }.to change {
                                   reaction_process.reload.reaction_process_steps.order(:position).map(&:position)
                                 }
      .from((0..3).to_a)
      .to((0..2).to_a)
  end

  it 'reorders siblings' do
    expect { destroy_action }.to change { reaction_process.reload.reaction_process_steps }.from(
      existing_steps,
    ).to(
      [existing_steps[0], existing_steps[1], existing_steps[3]],
    )
  end
end
