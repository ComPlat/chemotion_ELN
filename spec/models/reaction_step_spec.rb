# frozen_string_literal: true

# == Schema Information
#
# Table name: reaction_steps
#
#  id          :bigint           not null, primary key
#  conditions  :string
#  deleted_at  :datetime
#  duration    :string
#  ph_operator :string           default("="), not null
#  ph_value    :float
#  position    :integer          not null
#  temperature :jsonb
#  vessel_size :jsonb
#  volume      :decimal(10, 4)
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  reaction_id :integer          not null
#
# Indexes
#
#  index_reaction_steps_on_deleted_at   (deleted_at)
#  index_reaction_steps_on_reaction_id  (reaction_id)
#
require 'rails_helper'

RSpec.describe ReactionStep do
  let(:reaction) { create(:reaction) }

  it 'belongs to a reaction and orders by position' do
    second = described_class.create!(reaction: reaction, position: 2)
    first = described_class.create!(reaction: reaction, position: 1)

    expect(reaction.reaction_steps.reload.map(&:id)).to eq([first.id, second.id])
  end

  it 'defaults temperature and vessel_size the same way a reaction does' do
    step = described_class.create!(reaction: reaction, position: 1)

    expect(step.temperature).to eq({ 'data' => [], 'userText' => '', 'valueUnit' => '°C' })
    expect(step.vessel_size).to eq({ 'unit' => 'ml', 'amount' => nil })
  end

  it 'leaves existing material rows without a step' do
    sample = create(:reactions_starting_material_sample, reaction: reaction)

    expect(sample.reaction_step).to be_nil
    expect(sample.carry_on).to be false
  end
end
