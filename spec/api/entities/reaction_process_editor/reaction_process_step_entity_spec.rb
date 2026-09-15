# frozen_string_literal: true

require 'rails_helper'

describe Entities::ReactionProcessEditor::ReactionProcessStepEntity do
  subject(:represented_step) { described_class.represent(reaction_process_step).as_json }

  let!(:reaction_process_step) { create_default(:reaction_process_step) }
  let(:first_activity) { create(:reaction_process_activity) }
  let(:second_activity) { create(:reaction_process_activity) }

  it 'exposes :value' do
    expect(represented_step).to include(value: reaction_process_step.id)
  end

  it 'exposes :reaction_id' do
    expect(represented_step).to include(reaction_id: reaction_process_step.reaction.id)
  end

  it 'exposes :select_options' do
    expect(represented_step[:select_options]).to be_instance_of(Hash)
  end

  it 'exposes :ordered reaction_process_activities' do
    first_activity
    second_activity

    expect(represented_step[:activities].pluck(:id)).to eq([first_activity.id, second_activity.id])
  end
end
