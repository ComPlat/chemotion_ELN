# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Usecases::Wellplates::ExportToResearchPlan do
  let(:user) { build(:user) }
  let(:wellplate) { build(:wellplate, :with_random_wells, number_of_readouts: 3) }
  let(:research_plan) { build(:research_plan, creator: user) }

  let(:exporter) { described_class.new(research_plan, wellplate) }

  describe 'execute!' do
    before do
      exporter.execute!
    end
    it 'saves the wellplate as table to the research plan body' do
      table = research_plan.body.last['value']

      expect(table['rows'].size).to eq 12 * 8
      expect(table['columns'].size).to eq 4 # coordinate + 3 readouts

      names = table['columns'].map { |column| column['name'] }
      expect(names).to eq ['X, Y', 'Readout 1', 'Readout 2', 'Readout 3']

      last_row = table['rows'].last
      last_well = wellplate
                  .wells
                  .find { |well| well.position_x ==  12 &&  well.position_y == 8 } # wellplate and wells are not persisted

      expected_readouts = last_well.readouts.map do |readout|
        readout['value'].to_s + ' ' + readout['unit'].to_s
      end
      expect(last_row['readout_1']).to eq expected_readouts.first
      expect(last_row['readout_2']).to eq expected_readouts.second
      expect(last_row['readout_3']).to eq expected_readouts.third
    end
  end
end
