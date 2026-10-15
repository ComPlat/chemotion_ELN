# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Measurement do
  let(:research_plan) { create(:research_plan) }
  let(:sample) { create(:sample) }

  describe 'validations' do
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

    it 'saves with an empty unit' do
      measurement = build(:measurement, sample: sample, source: research_plan, unit: '')

      expect(measurement.save).to be(true)
    end
  end

  describe 'before_save :strip_whitespaces' do
    it 'strips surrounding whitespace from description and unit' do
      measurement = create(:measurement, sample: sample, source: research_plan, description: '  Yield  ', unit: ' % ')

      expect(measurement.reload).to have_attributes(description: 'Yield', unit: '%')
    end
  end
end
