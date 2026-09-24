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
  let(:research_plan) { create(:research_plan) }
  let(:sample) { create(:sample) }

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
  end

  describe 'before_save :strip_whitespaces' do
    let(:measurement) do
      build(:measurement, sample: sample, source: research_plan, description: '  Yield  ', unit: ' % ')
    end

    it 'strips surrounding whitespace from description and unit' do
      measurement.save!

      expect(measurement.reload).to have_attributes(description: 'Yield', unit: '%')
    end
  end

  describe '#destroy' do
    it 'soft deletes the measurement' do
      measurement = create(:measurement, sample: sample, source: research_plan)
      measurement.destroy

      expect(described_class.find_by(id: measurement.id)).to be_nil
      expect(described_class.with_deleted.find(measurement.id).deleted_at).to be_present
    end
  end
end
