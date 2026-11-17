# frozen_string_literal: true

# == Schema Information
#
# Table name: measurements
#
#  id          :bigint           not null, primary key
#  deleted_at  :datetime
#  description :string           not null
#  metadata    :jsonb
#  source_type :string
#  unit        :string           not null
#  value       :decimal(, )      not null
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  sample_id   :bigint           not null
#  source_id   :bigint
#  well_id     :bigint
#
# Indexes
#
#  index_measurements_on_deleted_at                 (deleted_at)
#  index_measurements_on_sample_id                  (sample_id)
#  index_measurements_on_source_type_and_source_id  (source_type,source_id)
#  index_measurements_on_well_id                    (well_id)
#
require 'rails_helper'

RSpec.describe Measurement do
  let(:research_plan) { build_stubbed(:research_plan) }
  let(:sample) { build_stubbed(:sample) }

  shared_context 'with persisted associations' do
    let(:research_plan) { create(:research_plan) }
    let(:sample) { create(:sample) }
  end

  describe 'associations' do
    it { is_expected.to belong_to(:sample).required }
    it { is_expected.to belong_to(:well).optional }
    it { is_expected.to belong_to(:source) }
  end

  describe 'validations' do
    it 'is invalid without a source' do
      measurement = build(:measurement, sample: sample, source: nil)

      expect(measurement).not_to be_valid
      expect(measurement.errors[:source]).to be_present
    end

    it 'is invalid without a sample' do
      measurement = build(:measurement, sample: nil, source: research_plan)

      expect(measurement).not_to be_valid
      expect(measurement.errors[:sample]).to be_present
    end

    %i[description unit value].each do |attribute|
      it "is invalid without #{attribute}" do
        measurement = build(:measurement, sample: sample, source: research_plan, attribute => nil)

        expect(measurement).not_to be_valid
        expect(measurement.errors[attribute]).to be_present
      end
    end

    it 'returns false from save instead of raising when description is missing' do
      measurement = build(:measurement, sample: sample, source: research_plan, description: nil)

      expect(measurement.save).to be(false)
    end

    context 'with an empty unit' do
      include_context 'with persisted associations'

      it 'saves' do
        measurement = build(:measurement, sample: sample, source: research_plan, unit: '')

        expect(measurement.save).to be(true)
      end
    end
  end

  describe 'before_validation :strip_whitespaces' do
    it 'strips before validations run' do
      measurement = build(:measurement, sample: sample, source: research_plan, description: '  Yield  ', unit: ' % ')
      measurement.valid?

      expect(measurement).to have_attributes(description: 'Yield', unit: '%')
    end

    context 'when saved' do
      include_context 'with persisted associations'

      it 'stores the stripped description and unit' do
        measurement = create(:measurement, sample: sample, source: research_plan, description: '  Yield  ', unit: ' % ')

        expect(measurement.reload).to have_attributes(description: 'Yield', unit: '%')
      end
    end
  end

  describe '#destroy' do
    include_context 'with persisted associations'

    it 'soft deletes the measurement' do
      measurement = create(:measurement, sample: sample, source: research_plan)
      measurement.destroy

      expect(described_class.find_by(id: measurement.id)).to be_nil
      expect(described_class.with_deleted.find(measurement.id).deleted_at).to be_present
    end
  end
end
