# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::SdsPictograms do
  def codes_for(*hazards)
    described_class.new(hazards).codes
  end

  it 'derives nothing from nothing' do
    expect(codes_for).to eq([])
  end

  it 'maps a hazard code to its Annex I pictogram', :aggregate_failures do
    expect(codes_for('H225')).to eq(['GHS02'])
    expect(codes_for('H318')).to eq(['GHS05'])
    expect(codes_for('H410')).to eq(['GHS09'])
    expect(codes_for('H351')).to eq(['GHS08'])
  end

  it 'splits a combined code' do
    expect(codes_for('H301+H311+H331')).to eq(['GHS06'])
  end

  it 'ignores a code that carries no pictogram' do
    expect(codes_for('H412', 'H413')).to eq([])
  end

  describe 'Article 26 precedence' do
    it 'drops the exclamation mark when the skull applies' do
      expect(codes_for('H301', 'H317')).to eq(['GHS06'])
    end

    it 'drops the exclamation mark when corrosion covers the same irritation' do
      expect(codes_for('H315', 'H318')).to eq(['GHS05'])
    end

    it 'keeps the exclamation mark for a hazard corrosion does not cover' do
      expect(codes_for('H318', 'H336')).to contain_exactly('GHS05', 'GHS07')
    end

    it 'drops the exclamation mark when respiratory sensitisation applies' do
      expect(codes_for('H334', 'H317')).to eq(['GHS08'])
    end

    it 'keeps it when the health hazard is not respiratory sensitisation' do
      expect(codes_for('H351', 'H315')).to contain_exactly('GHS07', 'GHS08')
    end
  end

  it 'derives the set the sheets in spec actually carry', :aggregate_failures do
    expect(codes_for('H225', 'H315', 'H318', 'H336', 'H412')).to contain_exactly('GHS02', 'GHS05', 'GHS07')
    expect(codes_for('H301+H311+H331', 'H317', 'H318', 'H341', 'H351', 'H372', 'H410'))
      .to contain_exactly('GHS05', 'GHS06', 'GHS08', 'GHS09')
  end
end
