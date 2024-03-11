# frozen_string_literal: true

RSpec.describe Usecases::ReactionProcessEditor::ReactionProcessVessels::SweepUnused do
  subject(:sweep_unused_vessels) do
    described_class.execute!(reaction_process_id: reaction_process.id)
  end

  let!(:reaction_process) { create_default(:reaction_process) }

  let!(:reaction_process_vessel) { create(:reaction_process_vessel) }
  let!(:replaced_reaction_process_vessel) { create(:reaction_process_vessel) }

  before do
    create(:reaction_process_step, reaction_process_vessel: reaction_process_vessel)
  end

  it 'destroys obsolete ReactionProcessVessel' do
    expect do
      sweep_unused_vessels
    end.to change {
             ReactionProcessEditor::ReactionProcessVessel.find_by(id: replaced_reaction_process_vessel.id)
           }.to(nil)
  end

  it 'retains used ReactionProcessVessel' do
    expect do
      sweep_unused_vessels
    end.not_to(change { ReactionProcessEditor::ReactionProcessVessel.find_by(id: reaction_process_vessel.id) })
  end

  it 'retains ReactionProcessVessel used in Activities' do
    create(:reaction_process_activity, reaction_process_vessel: replaced_reaction_process_vessel)
    expect do
      sweep_unused_vessels
    end.not_to(change { ReactionProcessEditor::ReactionProcessVessel.find_by(id: replaced_reaction_process_vessel.id) })
  end
end
