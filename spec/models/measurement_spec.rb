# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Measurement do
  let(:research_plan) { build_stubbed(:research_plan) }
  let(:sample) { build_stubbed(:sample) }

  shared_context 'with persisted associations' do
    let(:research_plan) { create(:research_plan) }
    let(:sample) { create(:sample) }
  end

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
end
