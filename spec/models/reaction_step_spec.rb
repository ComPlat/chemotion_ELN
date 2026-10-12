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

  describe 'per-step reference' do
    let(:user) { create(:person) }
    let(:mol) do
      lambda do |mmol, **real|
        create(:sample, created_by: user.id, target_amount_value: mmol / 1000.0, target_amount_unit: 'mol', **real)
      end
    end
    let(:start) { mol.call(10) }
    let(:carried) { mol.call(8, real_amount_value: 0.008, real_amount_unit: 'mol') }
    let(:reagent) { mol.call(12) }
    let(:final) { mol.call(6, real_amount_value: 0.006, real_amount_unit: 'mol') }
    let(:first) { described_class.create!(reaction: reaction, position: 1) }
    let(:second) { described_class.create!(reaction: reaction, position: 2) }
    let!(:rows) do
      {
        start: ReactionsStartingMaterialSample.create!(reaction: reaction, sample: start, reaction_step: first,
                                                       reference: true),
        carried: ReactionsProductSample.create!(reaction: reaction, sample: carried, reaction_step: first,
                                                carry_on: true),
        reagent: ReactionsReactantSample.create!(reaction: reaction, sample: reagent, reaction_step: second),
        final: ReactionsProductSample.create!(reaction: reaction, sample: final, reaction_step: second),
      }
    end

    it 'defaults a later step to the carried product and leaves step 1 alone' do
      expect(second.reference_row).to eq(rows[:carried])
      expect(first.reference_row).to be_nil
    end

    it 'measures later-step equivalents against the step reference' do
      rows.each_value(&:update_equivalent)

      expect(rows[:reagent].reload.equivalent).to be_within(1e-6).of(1.5)
      expect(rows[:final].reload.equivalent).to be_within(1e-6).of(0.75)
      expect(rows[:carried].reload.equivalent).to be_within(1e-6).of(0.8)
    end

    it 'uses the reagent once it is picked as the step reference' do
      rows[:reagent].update!(step_reference: true)
      rows.each_value(&:update_equivalent)

      expect(rows[:reagent].reload.equivalent).to eq(1.0)
      expect(rows[:final].reload.equivalent).to be_within(1e-6).of(0.5)
      expect(rows[:start].reload.equivalent).to eq(1.0)
    end
  end
end
