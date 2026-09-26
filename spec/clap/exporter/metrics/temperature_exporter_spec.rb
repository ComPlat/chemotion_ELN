# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Metrics::TemperatureExporter do
  subject(:temperature_export) { described_class.new({ 'value' => 21, 'unit' => 'CELSIUS' }).to_clap }

  it 'exports temperature' do
    expect(temperature_export.to_h).to eq(value: 21.0, unit: :CELSIUS)
  end
end
