# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Usecases::ResearchPlans::ImportWellplateAsTable do
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
      expect(table['columns'].size).to eq 8 # coordinate + sample + (3 readouts * fields)

      names = table['columns'].map { |column| column['headerName'] }
      expect(names).to eq [
        'Position',
        'Sample',
        'Readout 1 Value',
        'Readout 1 Unit',
        'Readout 2 Value',
        'Readout 2 Unit',
        'Readout 3 Value',
        'Readout 3 Unit',
      ]

      last_row = table['rows'].last
      last_well = wellplate
                  .wells
                  .find { |well| well.position_x == 12 && well.position_y == 8 } # wellplate and wells are not persisted

      expect(last_row['wellplate_position']).to eq 'H12'
      expect(last_row['readout_1_value']).to eq last_well.readouts.first['value']
      expect(last_row['readout_1_unit']).to eq last_well.readouts.first['unit']
      expect(last_row['readout_2_value']).to eq last_well.readouts.second['value']
      expect(last_row['readout_2_unit']).to eq last_well.readouts.second['unit']
      expect(last_row['readout_3_value']).to eq last_well.readouts.third['value']
      expect(last_row['readout_3_unit']).to eq last_well.readouts.third['unit']
    end
  end
end
