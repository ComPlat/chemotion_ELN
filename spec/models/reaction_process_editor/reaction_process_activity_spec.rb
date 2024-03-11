# frozen_string_literal: true

require 'rails_helper'

SAMPLE_KEYS = %w[SAMPLE SOLVENT].freeze
MEDIUM_KEYS = %w[ADDITIVE MEDIUM DIVERSE_SOLVENT].freeze

ACTIVITY_ADDS_SAMPLE_KEYS = %w[ADD TRANSFER].freeze
# All Keys which are currently in use, but basically all arbitrary names / all others.
ACTIVITY_ADDS_NO_SAMPLE_KEYS = %w[PURIFY REMOVE ANALYSIS SAVE WAIT CONDITION].freeze

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

  describe '#adds_sample?' do
    ACTIVITY_ADDS_SAMPLE_KEYS.each do |key|
      it "#{key} -> true" do
        process_activity.activity_name = key
        expect(process_activity).to be_adds_sample
      end
    end

    ACTIVITY_ADDS_NO_SAMPLE_KEYS.each do |key|
      it "#{key} -> false" do
        process_activity.activity_name = key
        expect(process_activity).not_to be_adds_sample
      end
    end
  end

  SAMPLE_KEYS.map do |acts_as|
    describe "bearing a #{acts_as} Sample" do
      subject(:process_activity) do
        create("reaction_process_activity_add_#{acts_as.downcase}".to_sym,
               workup: { sample_id: sample.id }.stringify_keys)
      end

      let(:sample) { create(acts_as.downcase.to_sym) }

      it 'sample?' do
        expect(process_activity).to be_sample
      end

      it 'acts_as_sample?' do
        expect(process_activity).to be_acts_as_sample
      end

      it 'returns Sample' do
        expect(process_activity.sample).to eq sample
      end

      it 'not medium?' do
        expect(process_activity).not_to be_medium
      end

      it 'not acts_as_medium?' do
        expect(process_activity).not_to be_acts_as_medium
      end

      it 'returns no Medium' do
        expect(process_activity.medium).to be_nil
      end
    end
  end

  MEDIUM_KEYS.map do |acts_as|
    describe "bearing a #{acts_as} Medium" do
      subject(:process_activity) do
        create("reaction_process_activity_add_#{acts_as.downcase}".to_sym,
               workup: { sample_id: medium.id, acts_as: acts_as }.stringify_keys)
      end

      let(:medium) { create(acts_as.downcase.to_sym) }

      it 'not sample?' do
        expect(process_activity).not_to be_sample
      end

      it 'not acts_as_sample?' do
        expect(process_activity).not_to be_acts_as_sample
      end

      it 'returns no Sample' do
        expect(process_activity.sample).to be_nil
      end

      it 'medium?' do
        expect(process_activity).to be_medium
      end

      it 'acts_as_medium?' do
        expect(process_activity).to be_acts_as_medium
      end

      it 'returns Medium' do
        expect(process_activity.medium).to eq medium
      end
    end
  end
end
