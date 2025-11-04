# frozen_string_literal: true

# == Schema Information
#
# Table name: reaction_processes
#
#  id                  :uuid             not null, primary key
#  automation_ordinal  :integer
#  default_conditions  :jsonb
#  deleted_at          :datetime
#  sample_initial_info :jsonb
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  reaction_id         :integer
#  sample_id           :integer
#  user_id             :integer
#
require 'rails_helper'

RSpec.describe ReactionProcessEditor::ReactionProcess do
  subject(:reaction_process) { create_default(:reaction_process) }

  it_behaves_like 'acts_as_paranoid soft-deletable model', :reaction_process

  it { is_expected.to belong_to(:reaction).optional }
  it { is_expected.to have_many(:reaction_process_vessels).dependent(:destroy) }

  it { is_expected.to have_many(:reaction_process_steps).dependent(:destroy) }
  it { is_expected.to have_many(:samples_preparations).dependent(:destroy) }
  it { is_expected.to have_one(:provenance).dependent(:destroy) }

  it { is_expected.to delegate_method(:reaction_svg_file).to(:reaction) }
  it { is_expected.to delegate_method(:short_label).to(:reaction) }
  it { is_expected.to delegate_method(:collections).to(:reaction) }

  describe 'conditions' do
    let(:user_defaults) { create(:reaction_process_defaults, user: reaction_process.creator).default_conditions }
    let(:reaction_defaults) { { TEMPERATURE: { value: '10', unit: 'CELSIUS' } }.deep_stringify_keys }

    let(:global_defaults) do
      { 'EQUIPMENT' => {}, 'IRRADIATION' => {}, 'MOTION' => {},
        'PH' => { 'unit' => 'PH', 'value' => 7 },
        'PRESSURE' => { 'unit' => 'MBAR', 'value' => '1013' },
        'TEMPERATURE' => { 'unit' => 'CELSIUS', 'value' => '21' }.deep_stringify_keys }
    end

    describe '#user_default_conditions' do
      it '{} when empty' do
        expect(reaction_process.user_default_conditions).to eq({})
      end

      it 'reflects reaction_default_conditions' do
        user_defaults
        expect(reaction_process.user_default_conditions).to eq(user_defaults)
      end
    end

    describe '#reaction_default_conditions' do
      it '{} when empty' do
        expect(reaction_process.reaction_default_conditions).to eq({})
      end

      it 'reflects reaction_default_conditions' do
        reaction_process.default_conditions = reaction_defaults
        expect(reaction_process.default_conditions).to eq(reaction_defaults)
      end
    end

    describe '#initial_conditions' do
      it 'reflects global_default_conditions' do
        expect(reaction_process.initial_conditions).to eq(global_defaults)
      end

      it 'reflects user_default_conditions' do
        user_defaults
        expect(reaction_process.initial_conditions).to eq(global_defaults.merge(user_defaults))
      end

      it 'reflects reaction_default_conditions' do
        user_defaults
        reaction_process.default_conditions = reaction_defaults
        expect(reaction_process.initial_conditions).to eq(global_defaults.merge(user_defaults).merge(reaction_defaults))
      end
    end
  end

  describe '#saved_sample_ids' do
    it 'includes actions sample_ids' do
      reaction_process
      create_default(:reaction_process_step)
      activities = create_list(:reaction_process_activity_save, 3)
      expect(reaction_process.saved_sample_ids).to include(
        activities[0].sample.id, activities[1].sample.id, activities[2].sample.id
      )
    end
  end
end
