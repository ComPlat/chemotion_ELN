# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Samples::SamplePreparationsExporter do
  subject(:preparation_export) { described_class.new(action).to_clap }

  let(:action) { create(:reaction_process_activity_add_sample) }

  before do
    create(
      :samples_preparation,
      reaction_process: action.reaction_process,
      sample: action.sample,
      preparations: %w[DISSOLVED DRIED],
      equipment: %w[FUNNEL REACTOR],
    )
  end

  it 'exports preparations for the action sample' do
    expect(preparation_export.to_h).to include(
      type: %i[DISSOLVED DRIED],
      equipment: [{ type: :FUNNEL }, { type: :REACTOR }],
    )
  end
end
