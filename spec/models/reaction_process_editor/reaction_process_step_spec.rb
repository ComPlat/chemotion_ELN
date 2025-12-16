# frozen_string_literal: true

# == Schema Information
#
# Table name: reaction_process_steps
#
#  id                         :uuid             not null, primary key
#  automation_mode            :string
#  automation_status          :string
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

  it_behaves_like 'acts_as_paranoid soft-deletable model', :reaction_process_step

  it { is_expected.to belong_to(:reaction_process) }
  it { is_expected.to belong_to(:reaction_process_vessel).optional(true) }
  it { is_expected.to have_many(:reaction_process_activities).dependent(:destroy) }

  it { is_expected.to delegate_method(:reaction).to(:reaction_process) }
  it { is_expected.to delegate_method(:creator).to(:reaction_process) }

  it '#siblings' do
    create_default(:reaction_process)
    siblings = create_list(:reaction_process_step, 5)
    expect(process_step.siblings).to eq(siblings.push(process_step))
  end

  it '#duration' do
    process_step
    %w[1000 2000 4000].map do |duration|
      create(:reaction_process_activity, workup: { duration: duration }.deep_stringify_keys)
    end

    expect(process_step.duration).to eq(7000)
  end

  describe '#label' do
    it 'has numbering' do
      expect(process_step.label).to eq('1/1 Example Step')
    end

    it 'has name' do
      other_step = create(:reaction_process_step, name: 'Next Step')
      expect(other_step.label).to eq('1/1 Next Step')
    end
  end

  describe 'conditions' do
    let(:user_defaults) do
      create(:reaction_process_defaults, user: process_step.reaction_process.creator).default_conditions
    end
    let(:reaction_defaults) { { TEMPERATURE: { value: '10', unit: 'CELSIUS' } }.deep_stringify_keys }

    let(:global_defaults) do
      { 'EQUIPMENT' => {}, 'IRRADIATION' => {}, 'MOTION' => {},
        'PH' => { 'unit' => 'PH', 'value' => 7 },
        'PRESSURE' => { 'unit' => 'MBAR', 'value' => '1013' },
        'TEMPERATURE' => { 'unit' => 'CELSIUS', 'value' => '21' }.deep_stringify_keys }
    end

    let(:expected_final_conditions) do
      { TEMPERATURE: { value: '200', unit: 'KELVIN' },
        PH: { value: '5', unit: 'PH' },
        PRESSURE: { value: '1013', unit: 'MBAR' },
        'EQUIPMENT' => {}, 'IRRADIATION' => {}, 'MOTION' => {} }.deep_stringify_keys
    end
    let(:expected_activity_preconditions) do
      [{ TEMPERATURE: { value: '1000', unit: 'CELSIUS' },
         PH: { value: '5', unit: 'PH' },
         PRESSURE: { value: '1013', unit: 'MBAR' }.deep_stringify_keys }]
    end

    before do
      process_step
      create(:reaction_process_activity_condition, workup: { TEMPERATURE: { value: '100', unit: 'CELSIUS' } })
      create(:reaction_process_activity_condition, workup: { TEMPERATURE: { value: '200', unit: 'KELVIN' } })
      create(:reaction_process_activity_condition, workup: { PH: { value: '5', unit: 'PH' } })
    end

    it '#activity_preconditions' do
      expect(
        process_step.activity_preconditions,
      ).to match([
                   global_defaults,
                   hash_including({ TEMPERATURE: { value: '100', unit: 'CELSIUS' } }.deep_stringify_keys),
                   hash_including({ TEMPERATURE: { value: '200', unit: 'KELVIN' } }.deep_stringify_keys),
                   hash_including({ PH: { value: '5', unit: 'PH' },
                                    TEMPERATURE: { value: '200', unit: 'KELVIN' } }.deep_stringify_keys),
                 ])
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

    it '[] on nonexisting key' do
      expect(process_step.added_materials('NONEXISTING')).to eq []
    end
  end
end
