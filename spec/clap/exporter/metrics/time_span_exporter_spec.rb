# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Metrics::TimeSpanExporter do
  subject(:duration_export) { described_class.new(90_000).to_clap }

  it 'exports milliseconds as seconds' do
    expect(duration_export.to_h).to eq(value: 90.0, unit: :SECOND)
  end
end
