# frozen_string_literal: true

require 'rails_helper'

describe Usecases::Reactions::UpdateSteps do
  let(:reaction) { create(:reaction, reaction_type: 'multi_step') }

  it 'creates steps and numbers them by the order received' do
    described_class.new(reaction, [
                          { position: 9, conditions: 'first' },
                          { position: 3, conditions: 'second' },
                        ]).execute!

    expect(reaction.reaction_steps.reload.map(&:position)).to eq([1, 2])
    expect(reaction.reaction_steps.map(&:conditions)).to eq(%w[first second])
  end

  it 'updates a step that was sent back with its id' do
    step = ReactionStep.create!(reaction: reaction, position: 1, conditions: 'old')

    described_class.new(reaction, [{ id: step.id, conditions: 'new' }]).execute!

    expect(step.reload.conditions).to eq('new')
  end

  it 'deletes steps that were not sent back' do
    ReactionStep.create!(reaction: reaction, position: 1, conditions: 'gone')
    kept = ReactionStep.create!(reaction: reaction, position: 2, conditions: 'kept')

    described_class.new(reaction, [{ id: kept.id, conditions: 'kept' }]).execute!

    expect(reaction.reaction_steps.reload.map(&:conditions)).to eq(['kept'])
  end

  it 'frees material rows that pointed at a deleted step' do
    step = ReactionStep.create!(reaction: reaction, position: 1)
    row = create(:reactions_product_sample, reaction: reaction, reaction_step: step, carry_on: true)

    described_class.new(reaction, []).execute!

    expect(row.reload.reaction_step_id).to be_nil
    expect(row.carry_on).to be false
  end

  it 'removes every step when nothing is sent' do
    ReactionStep.create!(reaction: reaction, position: 1)

    described_class.new(reaction, nil).execute!

    expect(reaction.reaction_steps.reload).to be_empty
  end

  describe 'search text' do
    let(:text) { ->(words) { { 'ops' => [{ 'insert' => "#{words}\n" }] } } }

    it 'rebuilds the search text when a step description changes' do
      step = ReactionStep.create!(reaction: reaction, position: 1, description: text.call('old'))
      allow(reaction).to receive(:refresh_search_text)

      described_class.new(reaction, [{ id: step.id, description: text.call('new') }]).execute!

      expect(reaction).to have_received(:refresh_search_text)
    end

    it 'rebuilds the search text when a step is deleted' do
      ReactionStep.create!(reaction: reaction, position: 1, description: text.call('gone'))
      allow(reaction).to receive(:refresh_search_text)

      described_class.new(reaction, []).execute!

      expect(reaction).to have_received(:refresh_search_text)
    end

    it 'leaves the search text alone when no step text changed' do
      step = ReactionStep.create!(reaction: reaction, position: 1, description: text.call('same'))
      allow(reaction).to receive(:refresh_search_text)

      described_class.new(reaction, [{ id: step.id, description: text.call('same'), conditions: 'rt' }]).execute!

      expect(reaction).not_to have_received(:refresh_search_text)
    end
  end
end
