# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Actions::MixingActionExporter do
  subject(:mixing_export) { described_class.new(action).to_clap(starts_at: 0).mixing }

  let(:action) do
    create(
      :reaction_process_activity,
      activity_name: 'MIXING',
      workup: { speed: { value: '600', unit: 'RPM' } }.deep_stringify_keys,
    )
  end

  it 'exports mixing speed' do
    expect(mixing_export.speed.to_h).to eq(value: 600.0, unit: :RPM)
  end
end
