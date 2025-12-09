# frozen_string_literal: true

RSpec.describe Usecases::ReactionProcessEditor::ReactionProcessVessels::CreateOrUpdate do
  subject(:create_or_update) do
    described_class.execute!(reaction_process_id: reaction_process.id,
                             reaction_process_vessel_params: reaction_process_vessel_params)
  end

  let!(:reaction_process) { create_default(:reaction_process) }
  let!(:vessel) { create(:vessel) }

  let(:reaction_process_vessel_params) do
    { vesselable_id: vessel.id, vesselable_type: 'Vessel', preparations: ['DRIED'],
      cleanup: 'WASTE' }.deep_stringify_keys
  end

  it 'creates ReactionProcessVessel' do
    expect do
      create_or_update
    end.to change {
             ReactionProcessEditor::ReactionProcessVessel.find_by(reaction_process_id: reaction_process.id,
                                                                  vesselable_id: vessel.id)
           }.from(nil)
  end

  it 'updates preparations' do
    expect do
      create_or_update
    end.to change {
             ReactionProcessEditor::ReactionProcessVessel.find_by(reaction_process_id: reaction_process.id,
                                                                  vesselable_id: vessel.id)&.preparations
           }.to(['DRIED'])
  end

  it 'updates cleanup' do
    expect do
      create_or_update
    end.to change {
             ReactionProcessEditor::ReactionProcessVessel.find_by(reaction_process_id: reaction_process.id,
                                                                  vesselable_id: vessel.id)&.cleanup
           }.to('WASTE')
  end

  context 'with existing ReactionProcessVessel' do
    let!(:reaction_process_vessel) { create(:reaction_process_vessel, vesselable: vessel) }

    it 'retains ReactionProcessVessel' do
      expect do
        create_or_update
      end.not_to(change do
                   ReactionProcessEditor::ReactionProcessVessel.find_by(reaction_process_id: reaction_process.id,
                                                                        vesselable_id: vessel.id).id
                 end)
    end

    it 'updates attributes' do
      expect do
        create_or_update
      end.to change { reaction_process_vessel.reload.preparations }.to(['DRIED'])
    end
  end
end
