# frozen_string_literal: true

require 'rails_helper'

describe Entities::ReactionProcessEditor::ReactionProcessActivityEntity do
  subject(:activity_entity) { described_class.represent(action).as_json }

  let(:action) { create(:reaction_process_activity) }

  it 'exposes :value' do
    expect(activity_entity).to include(value: action.id)
  end

  it 'exposes :preconditions' do
    expect(activity_entity)
      .to include(preconditions: Entities::ReactionProcessEditor::Constants::Conditions::GLOBAL_DEFAULTS)
  end

  describe 'exposes fractions' do
    let(:second_fraction) { create(:fraction, parent_action: action, position: 2) }
    let(:first_fraction) { create(:fraction, parent_action: action, position: 1) }

    before do
      second_fraction
      first_fraction
    end

    it 'orders fractions by position' do
      expect(activity_entity[:fractions].pluck(:id)).to eq(
        [first_fraction.id, second_fraction.id],
      )
    end
  end

  describe 'exposes transfer steps' do
    let(:action) do
      create(:reaction_process_activity,
             reaction_process_step: target_step,
             activity_name: 'TRANSFER',
             workup: { source_step_id: source_step.id }.stringify_keys)
    end
    let(:source_step) { create(:reaction_process_step, name: 'Source') }
    let(:target_step) { create(:reaction_process_step, name: 'Target') }

    it 'exposes :transfer source and target step names' do
      expect(activity_entity).to include(
        transfer_source_step_name: 'Source',
        transfer_target_step_name: 'Target',
      )
    end
  end
end
