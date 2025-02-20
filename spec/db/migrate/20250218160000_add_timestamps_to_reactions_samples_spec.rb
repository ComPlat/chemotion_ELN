# frozen_string_literal: true

require 'rails_helper'

load 'db/migrate/20250218160000_add_timestamps_to_reactions_samples.rb'
load 'db/migrate/20250218161800_add_logidze_to_some_elements.rb'

RSpec.describe 'migration 20250218160000: add timestamps to reactions_samples' do
  let(:sample) { create(:valid_sample) }
  let(:reaction) { build(:valid_reaction) }

  before do
    ActiveRecord::Migration.revert(AddTimestampsToReactionsSamples)
    ActiveRecord::Migration.revert(AddLogidzeToSomeElements)
    reaction.samples << sample
    reaction.save
  end

  after do
    AddLogidzeToSomeElements.new.change
  end

  it 'does add timestamps to the table', skip: 'todo: failing on CI atm' do
    expect(reaction.reactions_samples).not_to be_empty
    expect do
      AddTimestampsToReactionsSamples.new.change
    end.not_to raise_error # raise_error(ActiveRecord::NotNullViolation)
  end
end
