# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Metrics::LengthExporter do
  subject(:length_export) { described_class.new({ 'value' => 6, 'unit' => 'CM' }).to_clap }

  it 'exports mapped length units' do
    expect(length_export.to_h).to eq(value: 6.0, unit: :CENTIMETER)
  end
end
