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
    let(:reaction) { create(:reaction, reaction_type: 'multi_step') }
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

    it 'groups the Word report materials per step, with the carried product first in step 2' do
      reaction.update!(reaction_type: 'multi_step')
      rows[:reagent].update!(step_reference: true)
      steps = word_report_steps(reaction)

      counts = steps.map { |s| [s[:title], s[:starting_materials].size, s[:reactants].size, s[:products].size] }

      expect(counts).to eq([['Step 1', 1, 0, 1], ['Step 2', 1, 1, 1]])
      expect(Float(steps[1][:starting_materials].first[:equiv])).to be_within(0.01).of(8.0 / 12)
    end

    it 'gives each step arrow only its own solvents' do
      reaction.update!(reaction_type: 'multi_step')
      ReactionsSolventSample.create!(reaction: reaction, sample: mol.call(1), reaction_step: first)

      solvents = reaction.reload.send(:scheme_steps_svg_paths).pluck(:solvents)

      expect(solvents.map(&:size)).to eq([1, 0])
    end

    it 'draws one arrow per step in the Word report picture' do
      reaction.update!(reaction_type: 'multi_step')
      data = Entities::ReactionReportEntity.represent(
        reaction.reload, current_user: user, detail_levels: { Reaction => 10, Sample => 10 }
      ).serializable_hash
      diagram = Reporter::Docx::DiagramReaction.new(obj: OpenStruct.new(data), format: 'png') # rubocop:disable Style/OpenStructUse

      expect(diagram.send(:steps_svg_paths).map { |s| s[:products].size }).to eq([0, 1])
    end

    it 'leaves the carried product out of the reaction RInChI products' do
      expect(reaction.reload.send(:retrieve_molfiles)[1].size).to eq(1)
    end

    context 'when switched back to standard with its steps kept' do
      before { reaction.update!(reaction_type: 'standard') }

      it 'keeps the steps and the carried link' do
        expect(reaction.reload.reaction_steps.count).to eq(2)
        expect(rows[:carried].reload.carry_on).to be true
      end

      it 'measures every equivalent against the reaction reference' do
        rows.each_value(&:update_equivalent)

        expect(rows[:reagent].reload.equivalent).to be_within(1e-6).of(1.2)
        expect(rows[:final].reload.equivalent).to be_within(1e-6).of(0.6)
      end

      it 'counts the intermediate as a plain product in the RInChI, the picture and the reports' do
        report_products = Entities::ReactionReportEntity.represent(
          reaction.reload, current_user: user, detail_levels: { Reaction => 10, Sample => 10 }
        ).serializable_hash[:products]

        expect(reaction.send(:retrieve_molfiles)[1].size).to eq(2)
        expect(reaction.send(:scheme_material_svg_paths, :reactions_product_samples, :products).size).to eq(2)
        expect(report_products.pluck(:carry_on)).to all(be false)
      end

      it 'numbers the reactants and conditions per step in the scheme picture' do
        first.update!(conditions: 'UV', temperature: { 'data' => [], 'userText' => '80', 'valueUnit' => '°C' })
        second.update!(conditions: 'microwave', duration: '2 Hour(s)')

        texts = reaction.reload.send(:scheme_composer).compose_reaction_svg.scan(%r{<text[^>]*>([^<]+)</text>}).flatten

        expect(texts).to include('1. 80 °C, Aceton, UV', '2. 2 h, microwave', '2.')
      end

      it 'drops the parts switched off for the reaction from the scheme picture' do
        first.update!(conditions: 'UV', temperature: { 'data' => [], 'userText' => '80', 'valueUnit' => '°C' })
        reaction.update!(scheme_hidden_parts: %w[temperature solvents])

        texts = reaction.reload.send(:scheme_composer).compose_reaction_svg.scan(%r{<text[^>]*>([^<]+)</text>}).flatten

        expect(texts).to include('1. UV')
      end

      it 'keeps it as one untitled block in the Word report' do
        steps = word_report_steps(reaction)

        expect(steps.pluck(:title)).to eq([nil])
        expect(steps[0][:products].size).to eq(2)
      end
    end

    def word_report_steps(rxn)
      data = Entities::ReactionReportEntity.represent(
        rxn.reload, current_user: user, detail_levels: { Reaction => 10, Sample => 10 }
      ).serializable_hash
      Reporter::Docx::DetailReaction.new(reaction: OpenStruct.new(data)).send(:steps) # rubocop:disable Style/OpenStructUse
    end

    it 'uses the reagent once it is picked as the step reference' do
      rows[:reagent].update!(step_reference: true)
      rows.each_value(&:update_equivalent)

      expect(rows[:reagent].reload.equivalent).to eq(1.0)
      expect(rows[:final].reload.equivalent).to be_within(1e-6).of(0.5)
      expect(rows[:start].reload.equivalent).to eq(1.0)
    end
  end

  describe 'step descriptions in search and sample reports' do
    let(:text) { ->(words) { { 'ops' => [{ 'insert' => "#{words}\n" }] } } }
    let(:multi) { create(:reaction, reaction_type: 'multi_step', description: text.call('heat it')) }
    let(:product) { create(:sample) }

    before do
      described_class.create!(reaction: multi, position: 1, description: text.call('heat it'))
      second = described_class.create!(reaction: multi, position: 2, description: text.call('cool it'))
      ReactionsProductSample.create!(reaction: multi, sample: product, reaction_step: second)
    end

    it 'searches the text of every step' do
      multi.reload.send(:update_to_plain_text_without_delay, true, false)

      expect(multi.reload.plain_text_description).to include('heat it', 'cool it')
    end

    it 'gives a step 2 product the text of step 2' do
      expect(product.reload.reaction_description).to eq(text.call('cool it'))
    end

    it 'gives the Word report every step with a heading, but only the reaction text when restricted' do
      represent = lambda do |level|
        Entities::ReactionReportEntity.represent(multi.reload, current_user: create(:person),
                                                               detail_levels: { Reaction => level, Sample => level })
                                      .serializable_hash[:description]['ops'].pluck('insert').join
      end

      expect(represent.call(10)).to eq("Step 1: heat it\nStep 2: cool it\n")
      expect(represent.call(0)).to eq("heat it\n")
    end

    it 'gives the Word report each step on its own line with a bold heading' do
      steps = multi.reload.steps_description(labels: true)['ops']
      ops = Reporter::Docx::Detail.new({}).send(:rm_redundant_newline, steps)

      expect(Reporter::Delta.new({ 'ops' => ops }).getHTML).to eq(
        '<p><b><span>Step 1: </span></b>heat it</p><p><b><span>Step 2: </span></b>cool it</p>',
      )
    end

    it 'puts each step text under its step in the Word report, unless the materials are hidden' do
      detail = lambda do |settings|
        data = Entities::ReactionReportEntity.represent(
          multi.reload, current_user: create(:person), detail_levels: { Reaction => 10, Sample => 10 }
        ).serializable_hash
        Reporter::Docx::DetailReaction.new(reaction: OpenStruct.new(data), rxn_settings: settings) # rubocop:disable Style/OpenStructUse
      end

      expect(detail.call(material: true, description: true).send(:steps).pluck(:description).map(&:present?))
        .to eq([true, true])
      expect(detail.call(material: false, description: true).send(:text_per_step?)).to be(false)
      expect(detail.call(material: true, description: false).send(:steps).pluck(:description)).to eq([nil, nil])
    end

    it 'starts each step on a new line and marks the carried product as intermediate in the SI report' do
      data = Entities::ReactionReportEntity.represent(
        multi.reload, current_user: create(:person), detail_levels: { Reaction => 10, Sample => 10 }
      ).serializable_hash
      detail = Reporter::Docx::DetailReaction.new(reaction: OpenStruct.new(data), template: 'supporting_information') # rubocop:disable Style/OpenStructUse

      expect(detail.send(:single_description_delta).pluck('insert').join).to include("heat it \nStep 2: ")
      expect(detail.send(:intermediate_delta, { carry_on: true }).pluck('insert')).to eq([' (intermediate)'])
      expect(detail.send(:intermediate_delta, { carry_on: false })).to eq([])
    end

    it 'keeps the reaction text for a standard reaction' do
      standard = create(:reaction, description: text.call('stir'))
      sample = create(:sample)
      ReactionsProductSample.create!(reaction: standard, sample: sample)

      expect(sample.reload.reaction_description).to eq(text.call('stir'))
      expect(standard.reload.steps_description).to eq(text.call('stir'))
    end
  end
end
