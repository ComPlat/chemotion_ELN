# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Actions::DefineFractionActionExporter do
  subject(:define_fraction_export) { described_class.new(action).to_clap(starts_at: 0).define_fraction }

  let(:action) { create(:reaction_process_activity, activity_name: 'DEFINE_FRACTION') }
  let(:fraction) { create(:fraction, consuming_action: action, vials: %w[A1 A2]) }

  before do
    fraction
  end

  it 'exports the generated fraction' do
    expect(define_fraction_export.fraction.position).to eq(1)
  end

  it 'exports generated fraction vials' do
    expect(define_fraction_export.fraction.vials).to eq(%w[A1 A2])
  end

  it 'exports generated fraction action ids' do
    expect(define_fraction_export.fraction.to_h).to include(
      consuming_action_id: action.id,
      parent_action_id: fraction.parent_action_id,
    )
  end
end
