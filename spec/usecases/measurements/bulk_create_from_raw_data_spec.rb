# frozen_string_literal: true

require 'rails_helper'

describe Usecases::Measurements::BulkCreateFromRawData do
  let(:current_user) { create(:person) }
  let(:collection) { create(:collection, user_id: current_user.id) }
  # we use a hack to speed up the test: assigning the transient attribute :sample to the wellplate factory, we assign the
  # same sample to all wells. This is not a regular case in practice, but sufficient for testing purposes
  let(:sample) { build(:valid_sample, creator: current_user, collections: [collection]) }
  let(:wellplate) { create(:wellplate, :with_random_wells, number_of_readouts: 3, collections: [collection], sample: sample) }
  let(:research_plan) { create(:research_plan, collections: [collection]) }
  let(:raw_data) do
    wellplate.wells.map do |well|
      well.readouts.map.with_index do |readout, readout_index|
        {
          description: wellplate.readout_titles[readout_index],
          sample_identifier: well.sample.short_label,
          unit: readout['unit'],
          value: readout['value']
        }.with_indifferent_access
      end
    end.flatten
  end
  let(:params) do
    {
      raw_data: raw_data,
      source_id: research_plan.id,
      source_type: 'research_plan'
    }
  end

  context 'when all data is accessible' do
    it 'creates measurements for each data point' do
      expect { described_class.new(current_user, params).execute! }.to change(Measurement, :count).by(96 * 3)

      measurements = Measurement.last(96 * 3)

      raw_data.each do |datapoint|
        measurement = measurements.find do |m|
          m.description == datapoint[:description] &&
            m.sample.short_label == datapoint[:sample_identifier] &&
            m.unit == datapoint[:unit] &&
            m.value.to_f == datapoint[:value] # db uses BigDecimal while spec has float
        end

        expect(measurement.present?).to be true
      end
    end
  end
end
