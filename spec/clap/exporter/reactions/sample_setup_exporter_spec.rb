# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Reactions::SampleSetupExporter do
  subject(:setup_export) { described_class.new(reaction_process).to_clap }

  context 'when process is a sample_process (has no associated reaction)' do
    let(:reaction_process) { create(:sample_process, :with_vessel) }

    it 'exports sample setup' do
      expect(setup_export.to_h)
        .to include({ sample: { label: String } })
    end

    it 'exports vessel' do
      expect(setup_export.to_h)
        .to include(
          vessel_template:
          hash_including({ id: reaction_process.reaction_process_vessel.vesselable.vessel_template_id }),
        )
    end

    context 'when process is a reaction process (not a sample process)' do
      let(:reaction_process) { create(:reaction_process) }

      it 'exports sample setup as `nil`' do
        expect(setup_export).to be_nil
      end
    end
  end
end
