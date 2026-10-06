# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Metrics::WavelengthRangeExporter do
  subject(:range_export) do
    described_class.new(
      {
        'is_range' => true,
        'peaks' => [{ 'value' => 365, 'unit' => 'NM' }],
      },
    ).to_clap
  end

  it 'exports wavelength peaks' do
    expect(range_export.to_h).to eq(is_range: true, peaks: [{ value: 365.0, unit: :NANOMETER }])
  end
end
