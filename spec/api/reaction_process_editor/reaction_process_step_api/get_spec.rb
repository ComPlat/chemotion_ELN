# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::ReactionProcessStepAPI, '.get' do
  include RequestSpecHelper

  subject(:get_process_step_request) do
    get("/api/v1/reaction_process_editor/reaction_process_steps/#{reaction_process_step.id}",
        headers: authorization_header)
  end

  let!(:reaction_process) { create_default(:reaction_process) }
  let!(:reaction_process_step) { create_default(:reaction_process_step, :with_vessel) }

  let(:expected_process_step_hash) do
    {
      reaction_process_id: anything,
      activities: [],
      reaction_process_vessel: anything,
      select_options: hash_including({
        added_materials: [],
        mounted_equipment: [],
      }.stringify_keys),
    }.deep_stringify_keys
  end

  let(:authorization_header) { authorized_header(reaction_process.creator) }

  it_behaves_like 'authorization restricted API call'

  it 'returns reaction_process_step' do
    get_process_step_request
    puts(parsed_json_response['reaction_process_step'])
    expect(parsed_json_response['reaction_process_step']).to include expected_process_step_hash
  end

  describe 'select_options' do
    let(:parsed_select_options) { parsed_json_response['reaction_process_step']['select_options'] }

    let!(:other_process_step) { create(:reaction_process_step) }
    let!(:medium) { create(:reaction_process_activity_add_medium).medium }
    let!(:saved_sample) { create(:reaction_process_activity_save).sample }

    let(:equipment_options) { { value: %w[SYRINGE SPATULA] } }

    before do
      create(:reaction_process_activity_condition, workup: { EQUIPMENT: equipment_options })
      get_process_step_request
    end

    it 'added_materials' do
      expected_materials = { acts_as: 'MEDIUM', id: medium.id }.deep_stringify_keys

      expect(parsed_select_options['added_materials']).to include(hash_including(expected_materials))
    end

    it 'removable_samples' do
      expected_medium_hash = { DIVERSE_SOLVENTS: [],
                               FROM_REACTION_STEP: [hash_including(
                                 { acts_as: 'MEDIUM', label: medium.label }.stringify_keys,
                               )],
                               FROM_REACTION: [
                                 hash_including(
                                   { acts_as: 'MEDIUM', label: medium.label }.stringify_keys,
                                 ),
                               ],
                               FROM_SAMPLE: [hash_including(
                                 { acts_as: 'SAMPLE', label: 'iupac_name' }.stringify_keys,
                               )],
                               FROM_METHOD: [],
                               STEPWISE: [],
                               SOLVENT_FROM_FRACTION: [] }
                             .deep_stringify_keys

      expect(parsed_select_options.dig('FORMS', 'REMOVE', 'removable_samples'))
        .to include(expected_medium_hash)
    end

    it 'assigned_vessel' do
      expect(parsed_json_response['reaction_process_step']['id']).to eq reaction_process_step.id
    end

    it 'mounted_equipment' do
      expect(
        parsed_select_options['mounted_equipment'],
      ).to eq([
                { label: 'Syringe', value: 'SYRINGE' }.deep_stringify_keys,
                { label: 'Spatula', value: 'SPATULA' }.deep_stringify_keys,
              ])

      equipment_options.deep_stringify_keys
    end

    it 'transferable_samples' do
      expected_samples = { id: saved_sample.id }.deep_stringify_keys

      expect(
        parsed_select_options.dig('FORMS', 'TRANSFER', 'transferable_samples'),
      ).to include(hash_including(expected_samples))
    end

    it 'transferable_to' do
      expect(parsed_select_options.dig('FORMS', 'TRANSFER', 'targets')).to include(
        hash_including({ value: reaction_process_step.id, saved_sample_ids: [saved_sample.id] }.stringify_keys),
        hash_including({ value: other_process_step.id, saved_sample_ids: [] }.stringify_keys),
      )
    end
  end
end
