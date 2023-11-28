# frozen_string_literal: true

require 'rails_helper'

describe Entities::ReactionProcessEditor::SelectOptions::ReactionProcess do
  subject(:reaction_process_options) do
    described_class.new.select_options_for(reaction_process: reaction_process)
  end

  let(:reaction_process) { create(:reaction_process) }
  let(:process_step) { create(:reaction_process_step, reaction_process: reaction_process, position: 0) }

  it '#select_options_for' do
    expect(reaction_process_options).to include({
                                                  samples_preparations: Hash,
                                                  vessel_preparations: Hash,
                                                  step_name_suggestions: Array,
                                                  materials: Hash,
                                                  equipment: Array,
                                                  FORMS: Hash,
                                                  ontologies: Array,
                                                  automation_control: Hash,

                                                })
  end

  describe 'automation_control' do
    let!(:activity) do
      create(:reaction_process_activity,
             reaction_process_step: process_step,
             position: 1,
             workup: { sample_id: 'saved-sample-id' })
    end

    it 'exposes :activities options' do
      expect(reaction_process_options.dig(:automation_control, :activities)).to include(
        hash_including(
          id: activity.id,
          value: activity.id,
          label: "1/1: 1 #{activity.activity_name}",
          saved_sample_id: 'saved-sample-id',
        ),
      )
    end
  end
end
