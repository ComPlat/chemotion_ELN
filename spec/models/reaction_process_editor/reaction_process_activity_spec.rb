# frozen_string_literal: true

# == Schema Information
#
# Table name: reaction_process_activities
#
#  id                         :uuid             not null, primary key
#  activity_name              :string
#  automation_ordinal         :integer
#  automation_response        :jsonb
#  deleted_at                 :datetime
#  position                   :integer
#  workup                     :json
#  created_at                 :datetime         not null
#  updated_at                 :datetime         not null
#  reaction_process_step_id   :uuid
#  reaction_process_vessel_id :uuid
#
require 'rails_helper'

SAMPLE_KEYS = %w[SAMPLE SOLVENT].freeze
MEDIUM_KEYS = %w[ADDITIVE MEDIUM DIVERSE_SOLVENT MODIFIER].freeze

ACTIVITY_ADDS_SAMPLE_KEYS = %w[ADD TRANSFER].freeze
# Currently used Keys, but basically everything else.
ACTIVITY_ADDS_NO_SAMPLE_KEYS = %w[PURIFICATION REMOVE ANALYSIS SAVE WAIT CONDITION].freeze

RSpec.describe ReactionProcessEditor::ReactionProcessActivity do
  subject(:process_activity) { create(:reaction_process_activity) }

  it_behaves_like 'acts_as_paranoid soft-deletable model', :reaction_process_activity

  it { is_expected.to belong_to(:reaction_process_step) }
  it { is_expected.to belong_to(:reaction_process_vessel).optional(true) }
  it { is_expected.to delegate_method(:reaction_process).to(:reaction_process_step) }
  it { is_expected.to delegate_method(:reaction).to(:reaction_process_step) }

  describe '#siblings' do
    let!(:siblings) do
      [process_activity] + create_list(:reaction_process_activity, 2,
                                       reaction_process_step: process_activity.reaction_process_step)
    end

    it 'returns self + siblings' do
      expect(process_activity.siblings).to eq siblings
    end
  end

  it '#condition?' do
    expect(process_activity.condition?).to be false
    process_activity.activity_name = 'CONDITION'
    expect(process_activity.condition?).to be true
  end

  it '#halts_automation?' do
    expect(process_activity.halts_automation?).to be false
    process_activity.workup['AUTOMATION_STATUS'] = 'HALT'
    expect(process_activity.halts_automation?).to be true
    process_activity.workup['AUTOMATION_STATUS'] = 'RESOLVED'
    expect(process_activity.halts_automation?).to be false
  end

  describe '#adds_compound?' do
    subject(:process_activity) do
      create(:reaction_process_activity,
             workup: { sample_id: sample.id }.stringify_keys)
    end

    let(:sample) { create(:valid_sample) }

    ACTIVITY_ADDS_SAMPLE_KEYS.each do |key|
      it "#{key} -> true" do
        process_activity.activity_name = key
        expect(process_activity).to be_adds_compound
      end
    end

    ACTIVITY_ADDS_NO_SAMPLE_KEYS.each do |key|
      it "#{key} -> false" do
        process_activity.activity_name = key
        expect(process_activity).not_to be_adds_compound
      end
    end

    context 'with deleted sample' do
      before do
        sample.destroy
      end

      ACTIVITY_ADDS_SAMPLE_KEYS.each do |key|
        it "#{key} -> false" do
          process_activity.activity_name = key
          expect(process_activity).not_to be_adds_compound
        end
      end
    end
  end

  SAMPLE_KEYS.map do |acts_as|
    describe "bearing a #{acts_as} Sample" do
      subject(:process_activity) do
        create(:"reaction_process_activity_add_#{acts_as.downcase}",
               workup: { sample_id: sample.id }.stringify_keys)
      end

      let(:sample) { create(acts_as.downcase.to_sym) }

      it 'carries_sample?' do
        expect(process_activity).to be_carries_sample
      end

      it 'returns Sample' do
        expect(process_activity.sample).to eq sample
      end

      it 'not carries_medium?' do
        expect(process_activity).not_to be_carries_medium
      end

      it 'returns no Medium' do
        expect(process_activity.medium).to be_nil
      end
    end
  end

  MEDIUM_KEYS.map do |acts_as|
    describe "bearing a #{acts_as} Medium" do
      subject(:process_activity) do
        create(:"reaction_process_activity_add_#{acts_as.downcase}",
               workup: { sample_id: medium.id, acts_as: acts_as }.stringify_keys)
      end

      let(:medium) { create(acts_as.downcase.to_sym) }

      it 'not carries_sample?' do
        expect(process_activity).not_to be_carries_sample
      end

      it 'returns no Sample' do
        expect(process_activity.sample).to be_nil
      end

      it 'carries_medium?' do
        expect(process_activity).to be_carries_medium
      end

      it 'returns Medium' do
        expect(process_activity.medium).to eq medium
      end
    end
  end
end
