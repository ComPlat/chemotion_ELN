# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::SdsPropertyParser do
  def parse(text)
    described_class.new(text.split("\n")).parse
  end

  describe 'the Sigma label-and-colon layout' do
    let(:section) do
      <<~SECTION
        9.1 Information on basic physical and chemical properties
              Physical state                           :  liquid
              Colour                                   :   No data available
              Boiling point/boiling range  :  50 °C
              Flash point                              :  4 °C
                                                           Method: closed cup
              Decomposition                            :   No data available
              temperature
              Density                                  :  0,773 g/cm3 (25 °C)
      SECTION
    end

    it 'reads the values the sheet states' do
      expect(parse(section).first).to eq('form' => 'liquid', 'boiling_point' => '50 °C',
                                         'flash_point' => '4 °C',
                                         'density' => '0.773 g/cm3 (25 °C)')
    end

    it 'records why the absent ones were left out', :aggregate_failures do
      skipped = parse(section).last['skipped']
      expect(skipped['color']['reason']).to eq('absent')
      expect(skipped['decomposition_temperature']['reason']).to eq('absent')
    end

    it 'joins a label that wrapped onto the next line' do
      expect(parse(section).last['skipped']['decomposition_temperature']['label'])
        .to eq('decomposition temperature')
    end
  end

  describe 'the Sigma lettered layout' do
    let(:section) do
      <<~SECTION
        9.1  Information on basic physical and chemical properties
               a)  Physical state            liquid
               d)  Melting                   Melting point/ range: 12 - 13 °C - lit.
                    point/freezing point
               h)  Flash point               27 °C - closed cup
               l)   Viscosity                Viscosity, kinematic: No data available
               p)  Density                 0,861 g/cm3 at 20 °C - lit.
                   Relative density        No data available
      SECTION
    end

    it 'reads the column layout and the label repeated inside the value' do
      expect(parse(section).first).to eq('form' => 'liquid', 'melting_point' => '12 - 13 °C',
                                         'flash_point' => '27 °C',
                                         'density' => '0.861 g/cm3 (20 °C)')
    end

    it 'leaves a value whose own prefix names another property' do
      expect(parse(section).last['skipped']['viscosity']['reason']).to eq('unparsed')
    end
  end

  describe 'the Fisher column layout' do
    let(:section) do
      <<~SECTION
        Physical State                      Liquid
        Color                               Clear Colorless - Light yellow
        Melting Point/Range                 No data available
        Flash Point                          14  °C  /  57.2  °F               Method -  No information available
        Density  /  Specific Gravity         0.770
        Vapor Density                       No data available                  (Air = 1.0)
      SECTION
    end

    it 'takes the value column and ignores the remarks column' do
      expect(parse(section).first).to eq('form' => 'Liquid',
                                         'color' => 'Clear Colorless - Light yellow',
                                         'flash_point' => '14 °C', 'density' => '0.770')
    end
  end

  describe 'a label it does not know' do
    it 'reports it rather than storing it', :aggregate_failures do
      properties, diagnostics = parse('   Surface tension         28,01 mN/m at 25 °C')
      expect(properties).to be_empty
      expect(diagnostics['unmapped_labels']).to eq(['surface tension'])
    end
  end
end
