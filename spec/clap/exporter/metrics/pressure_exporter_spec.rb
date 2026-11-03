# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Metrics::PressureExporter do
  subject(:pressure_export) { described_class.new({ 'value' => 1013, 'unit' => 'MBAR' }).to_clap }

  it 'exports pressure' do
    expect(pressure_export.to_h).to eq(value: 1013.0, unit: :MBAR)
  end
end
