# frozen_string_literal: true

require 'rails_helper'

describe Entities::ReactionProcessEditor::SelectOptions::Forms::Transfer do
  describe '#select_options_for' do
    subject(:select_options) { described_class.new.select_options_for(reaction_process: reaction_process) }

    let!(:reaction_process) { create(:sample_process, sample: create(:valid_sample)) }
    let!(:process_step) { create(:reaction_process_step, reaction_process: reaction_process) }

    it 'returns transferable samples and target steps' do
      expect(select_options).to include(
        transferable_samples: [hash_including(value: reaction_process.sample_id)],
        targets: [hash_including(value: process_step.id)],
      )
    end

    it 'returns equipment' do
      expect(select_options).to include(equipment: Array)
    end
  end
end
