# frozen_string_literal: true

require 'rails_helper'

describe Entities::ReactionProcessEditor::ReactionProcessEntity do
  subject(:represented_reaction_process) { described_class.represent(reaction_process).as_json }

  let(:sample) { create(:valid_sample) }
  let(:reaction_process) { create(:reaction_process) }
  let(:target_step) { create(:reaction_process_step, reaction_process: reaction_process) }

  it 'exposes :reaction_process_steps' do
    expect(represented_reaction_process[:reaction_process_steps]).to be_instance_of(Array)
  end

  it 'exposes :samples_preparations' do
    expect(represented_reaction_process[:samples_preparations]).to be_instance_of(Array)
  end

  it 'exposes :reaction_process_vessels' do
    expect(represented_reaction_process[:reaction_process_vessels]).to be_instance_of(Array)
  end

  it 'exposes :provenance' do
    expect(represented_reaction_process[:provenance]).to be_present
  end

  it 'exposes :sample (as nil)' do
    expect(represented_reaction_process[:sample]).to be_nil
  end

  it 'exposes :reaction_process_vessel (as nil)' do
    expect(represented_reaction_process[:reaction_process_vessel]).to be_nil
  end

  it 'exposes :reaction_default_conditions' do
    expect(represented_reaction_process[:reaction_default_conditions]).to be_instance_of(Hash)
  end

  it 'exposes :select_options' do
    expect(represented_reaction_process[:select_options]).to be_instance_of(Hash)
  end

  describe 'Sample process' do
    let(:reaction_process) do
      create(:sample_process, sample: sample, reaction_process_vessel: create(:reaction_process_vessel))
    end

    let(:transfer) do
      create(:reaction_process_activity,
             reaction_process_step: target_step,
             activity_name: 'TRANSFER',
             workup: {
               sample_id: sample.id,
             })
    end

    it 'exposes :sample' do
      expect(represented_reaction_process[:sample]).to be_present
    end

    it 'exposes :reaction_process_vessel' do
      expect(represented_reaction_process.dig(:reaction_process_vessel, :id))
        .to eq reaction_process.reaction_process_vessel_id
    end

    it 'exposes :initial_sample transfer activities' do
      transfer
      expect(represented_reaction_process[:initial_sample_transfers].pluck(:id)).to eq(
        [transfer.id],
      )
    end
  end
end
