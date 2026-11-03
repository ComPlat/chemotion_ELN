# frozen_string_literal: true

# == Schema Information
#
# Table name: reaction_process_steps
#
#  id                         :uuid             not null, primary key
#  automation_control         :jsonb
#  automation_mode            :string
#  deleted_at                 :datetime
#  locked                     :boolean
#  name                       :string
#  position                   :integer
#  created_at                 :datetime         not null
#  updated_at                 :datetime         not null
#  reaction_process_id        :uuid
#  reaction_process_vessel_id :uuid
#
require 'rails_helper'

RSpec.describe ReactionProcessEditor::ReactionProcessStep do
  subject(:process_step) { create_default(:reaction_process_step) }

  let(:siblings) { create_list(:reaction_process_step, 5) }

  it_behaves_like 'acts_as_paranoid soft-deletable model', :reaction_process_step

  it { is_expected.to belong_to(:reaction_process) }
  it { is_expected.to belong_to(:reaction_process_vessel).optional(true) }
  it { is_expected.to have_many(:reaction_process_activities).dependent(:destroy) }

  it { is_expected.to delegate_method(:reaction).to(:reaction_process) }
  it { is_expected.to delegate_method(:creator).to(:reaction_process) }

  it '#siblings' do
    create_default(:reaction_process)
    expect(process_step.siblings).to eq([process_step, *siblings])
  end

  it '#duration' do
    process_step
    %w[1000 2000 4000].map do |duration|
      create(:reaction_process_activity, workup: { duration: duration }.deep_stringify_keys)
    end

    expect(process_step.duration).to eq(7000)
  end

  describe '#label' do
    let(:other_step) { create(:reaction_process_step, name: 'Next Step') }

    it 'has numbering' do
      expect(process_step.label).to eq('1/1 Example Step')
    end

    it 'has name' do
      expect(other_step.label).to eq('1/1 Next Step')
    end
  end

  describe 'conditions' do
    let(:global_defaults) do
      { 'EQUIPMENT' => {}, 'IRRADIATION' => {}, 'MOTION' => {},
        'PH' => { 'unit' => 'PH', 'value' => 7 },
        'PRESSURE' => { 'unit' => 'MBAR', 'value' => '1013' },
        'TEMPERATURE' => { 'unit' => 'CELSIUS', 'value' => '21' },
        'automation_mode' => 'NCIT:C70669' }
    end

    let(:expected_final_conditions) do
      { TEMPERATURE: { value: '200', unit: 'KELVIN' },
        PH: { value: '5', unit: 'PH' },
        PRESSURE: { value: '1013', unit: 'MBAR' },
        'automation_mode' => 'NCIT:C70669',
        'EQUIPMENT' => {}, 'IRRADIATION' => {}, 'MOTION' => {} }.deep_stringify_keys
    end

    let(:activity_preconditions) { process_step.activity_preconditions }

    before do
      process_step
      create(:reaction_process_activity_condition, workup: { TEMPERATURE: { value: '100', unit: 'CELSIUS' } })
      create(:reaction_process_activity_condition, workup: { TEMPERATURE: { value: '200', unit: 'KELVIN' } })
      create(:reaction_process_activity_condition, workup: { PH: { value: '5', unit: 'PH' } })
    end

    it 'inits activity_preconditions with global defaults' do
      expect(activity_preconditions.first).to eq(global_defaults)
    end

    it 'reflects the first temperature condition in activity_preconditions' do
      expect(activity_preconditions.second).to include(
        { TEMPERATURE: { value: '100', unit: 'CELSIUS' } }.deep_stringify_keys,
      )
    end

    it 'reflects the second temperature condition in activity_preconditions' do
      expect(activity_preconditions.third).to include(
        { TEMPERATURE: { value: '200', unit: 'KELVIN' } }.deep_stringify_keys,
      )
    end

    it 'retains the latest temperature into later activity_preconditions' do
      expect(activity_preconditions.fourth).to include(
        { PH: { value: '5', unit: 'PH' },
          TEMPERATURE: { value: '200', unit: 'KELVIN' } }.deep_stringify_keys,
      )
    end

    it '#final_conditions' do
      expect(process_step.final_conditions).to eq(expected_final_conditions)
    end
  end

  describe '#added_materials' do
    let!(:solvents) do
      create_list(:reaction_process_activity_add_solvent, 2, reaction_process_step: process_step).map(&:sample)
    end
    let!(:additives) { create_list(:reaction_process_activity_add_additive, 2).map(&:medium) }
    let!(:diverse_solvents) { create_list(:reaction_process_activity_add_diverse_solvent, 2).map(&:medium) }
    let!(:media) { create_list(:reaction_process_activity_add_medium, 2).map(&:medium) }

    let(:modifiers) { create_list(:modifier, 2) }

    it 'Solvents' do
      expect(process_step.added_materials('SOLVENT')).to match_array solvents
    end

    it 'Additives' do
      expect(process_step.added_materials('ADDITIVE')).to match_array additives
    end

    it 'Diverse Solvents' do
      expect(process_step.added_materials('DIVERSE_SOLVENT')).to match_array diverse_solvents
    end

    it 'Media' do
      expect(process_step.added_materials('MEDIUM')).to match_array media
    end

    it 'Modifiers' do
      modifiers.each do |modifier|
        create(:reaction_process_activity_add_modifier, reaction_process_step: process_step, medium: modifier)
      end

      expect(process_step.added_materials('MODIFIER')).to match_array modifiers
    end

    it '[] on nonexisting key' do
      expect(process_step.added_materials('NONEXISTING')).to eq []
    end
  end

  describe '#predecessors' do
    let(:reaction_process) { create(:reaction_process) }
    let(:first_step) { create(:reaction_process_step, reaction_process: reaction_process, position: 0) }
    let(:second_step) { create(:reaction_process_step, reaction_process: reaction_process, position: 1) }
    let(:third_step) { create(:reaction_process_step, reaction_process: reaction_process, position: 2) }

    before do
      first_step
      second_step
      third_step
    end

    it 'returns earlier siblings' do
      expect(third_step.predecessors).to eq([first_step, second_step])
    end
  end

  describe '#mounted_equipment' do
    it 'exposes EQUIPMENT values from condition activities' do
      create(:reaction_process_activity_condition, reaction_process_step: process_step,
                                                   workup: { EQUIPMENT: { value: 'REACTOR' } })

      expect(process_step.mounted_equipment).to eq(['REACTOR'])
    end

    it 'exposes equipment values from non-condition activities' do
      create(:reaction_process_activity, reaction_process_step: process_step,
                                         workup: { equipment: ['PUMP'] })

      expect(process_step.mounted_equipment).to eq(['PUMP'])
    end
  end
end
