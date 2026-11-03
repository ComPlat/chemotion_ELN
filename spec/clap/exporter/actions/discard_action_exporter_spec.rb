# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Actions::DiscardActionExporter do
  subject(:discard_export) { described_class.new(action).to_clap(starts_at: 0).discard }

  let(:action) { create(:reaction_process_activity, activity_name: 'DISCARD') }
  let(:fraction) { create(:fraction, consuming_action: action, vials: %w[B1 B2]) }

  before do
    fraction
  end

  it 'exports the consumed fraction' do
    expect(discard_export.fraction.parent_action_id).to eq(fraction.parent_action_id)
  end

  it 'exports consumed fraction vials' do
    expect(discard_export.fraction.vials).to eq(%w[B1 B2])
  end
end
