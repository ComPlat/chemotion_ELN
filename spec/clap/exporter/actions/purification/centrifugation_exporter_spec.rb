# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Actions::Purification::CentrifugationExporter do
  subject(:centrifugation_export) { described_class.new(action).to_clap(starts_at: 0).centrifugation }

  let(:action) do
    create(
      :reaction_process_activity,
      activity_name: 'CENTRIFUGATION',
      workup: {
        PRESSURE: { value: '2', unit: 'BAR' },
        TEMPERATURE: { value: '4', unit: 'CELSIUS' },
        SPEED: { value: '1000', unit: 'RPM' },
      }.deep_stringify_keys,
    )
  end

  it 'exports centrifugation conditions' do
    expect(centrifugation_export.to_h).to include(
      pressure: { value: 2.0, unit: :BAR },
      temperature: { value: 4.0, unit: :CELSIUS },
      speed: { value: 1000.0, unit: :RPM },
    )
  end
end
