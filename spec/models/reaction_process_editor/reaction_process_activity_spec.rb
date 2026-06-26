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
# Basically everything else adds no sample.
ACTIVITY_ADDS_NO_SAMPLE_KEYS = %w[ANALYSIS_CHROMATOGRAPHY CHROMATOGRAPHY REMOVE SAVE WAIT CONDITION].freeze

RSpec.describe ReactionProcessEditor::ReactionProcessActivity do
  subject(:process_activity) { create(:reaction_process_activity) }

  it_behaves_like 'acts_as_paranoid soft-deletable model', :reaction_process_activity

  it { is_expected.to belong_to(:reaction_process_step) }
  it { is_expected.to belong_to(:reaction_process_vessel).optional(true) }

  it { is_expected.to have_one(:reactions_intermediate_sample).dependent(:nullify) }
  it { is_expected.to have_one(:consumed_fraction).dependent(:nullify) }
  it { is_expected.to have_many(:fractions).dependent(:destroy) }

  it { is_expected.to delegate_method(:reaction_process).to(:reaction_process_step) }
  it { is_expected.to delegate_method(:reaction).to(:reaction_process_step) }
  it { is_expected.to delegate_method(:automation_mode).to(:reaction_process_step) }
  it { is_expected.to delegate_method(:creator).to(:reaction_process_step) }

  describe '#siblings' do
    let!(:siblings) do
      [process_activity] + create_list(:reaction_process_activity, 2,
                                       reaction_process_step: process_activity.reaction_process_step)
    end

    it 'returns self + siblings' do
      expect(process_activity.siblings).to eq siblings
    end
  end

  describe '#saves_sample?' do
    it 'is true for save actions' do
      process_activity.activity_name = 'SAVE'

      expect(process_activity).to be_saves_sample
    end

    it 'is false for non-save actions' do
      expect(process_activity).not_to be_saves_sample
    end
  end

  describe '#condition?' do
    it 'is false for non-condition actions' do
      expect(process_activity).not_to be_condition
    end

    it 'is true for condition actions' do
      process_activity.activity_name = 'CONDITION'

      expect(process_activity).to be_condition
    end
  end

  describe '#transfer?' do
    subject(:process_activity) do
      create(:reaction_process_activity, activity_name: 'TRANSFER',
                                         workup: { sample_id: sample.id }.stringify_keys)
    end

    let(:sample) { create(:valid_sample) }

    it 'is true for transfer actions' do
      expect(process_activity).to be_transfer
    end

    it 'is true for the matching sample id' do
      expect(process_activity.transfer?(sample_id: sample.id)).to be true
    end

    it 'is false for another sample id' do
      expect(process_activity.transfer?(sample_id: create(:valid_sample).id)).to be false
    end
  end

  describe '#remove?' do
    it 'is true for remove actions' do
      process_activity.activity_name = 'REMOVE'

      expect(process_activity).to be_remove
    end
  end

  describe '#removes_substance?' do
    %w[REMOVE EVAPORATION DISCARD].each do |activity_name|
      it "is true for #{activity_name}" do
        process_activity.activity_name = activity_name

        expect(process_activity).to be_removes_substance
      end
    end

    it 'is false for add actions' do
      process_activity.activity_name = 'ADD'

      expect(process_activity).not_to be_removes_substance
    end
  end

  describe '#carries_substance?' do
    it 'is false for remove actions' do
      process_activity.activity_name = 'REMOVE'

      expect(process_activity).not_to be_carries_substance
    end

    it 'is true for add actions' do
      process_activity.activity_name = 'ADD'

      expect(process_activity).to be_carries_substance
    end
  end

  describe '#adds_substance?' do
    subject(:process_activity) do
      create(:reaction_process_activity,
             workup: { sample_id: sample.id }.stringify_keys)
    end

    let(:sample) { create(:valid_sample) }

    ACTIVITY_ADDS_SAMPLE_KEYS.each do |key|
      it "#{key} -> true" do
        process_activity.activity_name = key
        expect(process_activity).to be_adds_substance
      end
    end

    ACTIVITY_ADDS_NO_SAMPLE_KEYS.each do |key|
      it "#{key} -> false" do
        process_activity.activity_name = key
        expect(process_activity).not_to be_adds_substance
      end
    end

    context 'with deleted sample' do
      before do
        sample.destroy
      end

      ACTIVITY_ADDS_SAMPLE_KEYS.each do |key|
        it "#{key} -> false" do
          process_activity.activity_name = key
          expect(process_activity).not_to be_adds_substance
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

      it 'returns no Ontology' do
        expect(process_activity.ontology).to be_nil
      end
    end
  end

  describe '#ontology' do
    subject(:process_activity) do
      create(:reaction_process_activity_add_sample,
             workup: { sample_id: ontology.ontology_id, acts_as: 'SAMPLE' }.stringify_keys)
    end

    let(:ontology) do
      create(
        :ontology,
        ontology_id: 'CHMO:0000004',
        label: 'Ontology label',
      )
    end

    it 'returns Ontology' do
      expect(process_activity.ontology).to eq ontology
    end
  end

  describe 'workup validation' do
    subject(:process_activity) { build(:reaction_process_activity, activity_name: 'SAVE', workup: {}) }

    before do
      process_activity.validate
    end

    it 'adds an error for save actions without a sample id' do
      expect(process_activity.errors[:workup]).to include('Missing Sample')
    end
  end

  describe 'position assignment' do
    subject(:process_activity) do
      build(:reaction_process_activity, reaction_process_step: reaction_process_step, position: nil)
    end

    let(:reaction_process_step) { create(:reaction_process_step) }

    before do
      create_list(:reaction_process_activity, 2, reaction_process_step: reaction_process_step)
      process_activity.save!
    end

    it 'defaults position to the sibling count' do
      expect(process_activity.position).to eq(2)
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
