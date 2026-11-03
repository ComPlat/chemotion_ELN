# frozen_string_literal: true

require 'rails_helper'

describe Entities::ReactionProcessEditor::SelectOptions::ReactionProcessStep do
  describe '#select_options_for' do
    subject(:select_options) { described_class.new.select_options_for(reaction_process_step: process_step) }

    let(:process_step) { create_default(:reaction_process_step, position: 0) }
    let(:sample) { create(:valid_sample) }
    let(:add_action) do
      create(:reaction_process_activity_add_sample,
             reaction_process_step: process_step,
             sample: sample,
             workup: { target_amount: { value: 1, unit: 'g' }, acts_as: 'SAMPLE' })
    end
    let(:save_action) do
      create(:reaction_process_activity_save,
             reaction_process_step: process_step,
             workup: {
               sample_origin_purification_step: {
                 solvents: [{ label: 'Water' }],
               },
               solvents_amount: { value: 1, unit: 'ml' },
             })
    end
    let(:purification) do
      create(:reaction_process_activity,
             reaction_process_step: process_step,
             activity_name: 'CHROMATOGRAPHY',
             workup: {
               purification_steps: [{ solvents: [{ label: 'Water' }] }],
             })
    end

    let(:fraction) { create(:fraction, parent_action: add_action, position: 1) }
    let(:removable_samples_options) { select_options.dig(:FORMS, :EVAPORATION, :removable_samples) }
    let(:save_sample_origins_options) { select_options.dig(:FORMS, :SAVE, :origins) }

    before do
      add_action
      save_action
      purification
      fraction
    end

    it 'returns added materials' do
      expect(select_options[:added_materials]).to include(hash_including(value: sample.id,
                                                                         amount: { 'value' => 1, 'unit' => 'g' }))
    end

    it 'returns saved samples' do
      expect(select_options[:saved_samples]).to include(save_action.sample)
    end

    it 'returns reaction_step removable samples' do
      expect(removable_samples_options[:FROM_REACTION_STEP]).to include(hash_including(value: sample.id))
    end

    it 'returns saved_sample in removable samples' do
      expect(removable_samples_options[:FROM_SAMPLE]).to include(hash_including(value: save_action.sample.id,
                                                                                solvents: [{ 'label' => 'Water' }]))
    end

    it 'returns removable samples from fractions' do
      expect(removable_samples_options[:SOLVENT_FROM_FRACTION]).to include(hash_including(value: fraction.id,
                                                                                          label: '(1) Fraction #1'))
    end

    it 'returns purification origins' do
      expect(save_sample_origins_options)
        .to include(hash_including(value: purification.id,
                                   label: "#{purification.position + 1} Chromatography",
                                   purification_steps: include(hash_including(
                                                                 label: "#{purification.position + 1}.1 Water",
                                                                 position: 1,
                                                               ))))
    end
  end
end
