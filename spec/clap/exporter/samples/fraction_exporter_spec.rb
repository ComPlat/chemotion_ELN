# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Samples::FractionExporter do
  subject(:clap_export) { described_class.new(fraction).to_clap }

  let(:fraction) { create(:fraction, vials: %w[A1 A2]) }

  it 'exports pooling fractions' do
    expect(clap_export.to_h).to include(position: 1, vials: %w[A1 A2])
  end

  context 'without a fraction' do
    let(:fraction) { nil }

    it 'returns nil' do
      expect(clap_export).to be_nil
    end
  end
end
