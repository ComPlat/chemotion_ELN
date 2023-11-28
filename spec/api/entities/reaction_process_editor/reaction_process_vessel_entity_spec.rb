# frozen_string_literal: true

require 'rails_helper'

describe Entities::ReactionProcessEditor::ReactionProcessVesselEntity do
  subject(:represented_vessel) { described_class.represent(reaction_process_vessel).as_json }

  let(:reaction_process_vessel) { create(:reaction_process_vessel) }

  it 'exposes :vesselable' do
    expect(represented_vessel[:vesselable]).to be_present
  end

  it 'exposes :preparations' do
    expect(represented_vessel[:preparations]).to be_instance_of(Array)
  end

  context 'when used in reaction_process_steps' do
    before do
      create(:reaction_process_step, reaction_process: reaction_process_vessel.reaction_process,
                                     reaction_process_vessel: reaction_process_vessel,
                                     name: 'Second',
                                     position: 2)
      create(:reaction_process_step, reaction_process: reaction_process_vessel.reaction_process,
                                     reaction_process_vessel: reaction_process_vessel,
                                     name: 'First',
                                     position: 1)
    end

    it 'exposes :step_names (ordered by position)' do
      expect(represented_vessel).to include(step_names: %w[First Second])
    end
  end

  context 'without preparations' do
    let(:reaction_process_vessel) { create(:reaction_process_vessel, preparations: nil) }

    it 'defaults preparations to an empty array' do
      expect(represented_vessel).to include(preparations: [])
    end
  end
end
