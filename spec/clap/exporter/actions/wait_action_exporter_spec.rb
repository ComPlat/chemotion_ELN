# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Actions::WaitActionExporter do
  subject(:wait_export) { described_class.new(action).to_clap(starts_at: 0) }

  let(:action) do
    create(
      :reaction_process_activity,
      activity_name: 'WAIT',
      workup: { duration: 1000, EQUIPMENT: { value: %w[STIRRER bad] } }.deep_stringify_keys,
    )
  end

  it 'exports equipment and falls back for unknown equipment' do
    expect(wait_export.equipment.map(&:type)).to eq(%i[STIRRER UNSPECIFIED])
  end

  it 'exports wait duration' do
    expect(wait_export.wait.duration.to_h).to eq(value: 1.0, unit: :SECOND)
  end

  it 'exports common action timing' do
    expect(wait_export.to_h).to include(
      start_time: { value: 0.0, unit: :SECOND },
      duration: { value: 1.0, unit: :SECOND },
    )
  end
end
