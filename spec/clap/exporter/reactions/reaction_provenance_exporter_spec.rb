# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Reactions::ReactionProvenanceExporter do
  subject(:clap_export) { described_class.new(provenance).to_clap }

  let(:provenance) { create(:provenance, starts_at: '2026-06-17 08:00:00 UTC') }

  it 'exports provenance fields' do
    expect(clap_export.to_h).to include(
      city: 'Karlsruhe',
      doi: '10.1109/5.771073',
      patent: 'Creative Commons',
      publication_url: 'https://github.com/comPlat/chemotion_ELN',
      experimenter: hash_including(username: 'User1 Complat', email: 'complat.user1@eln.edu'),
      experiment_start: { value: '2026-06-17T08:00:00Z' },
    )
  end

  context 'without provenance' do
    let(:provenance) { nil }

    it 'returns nil' do
      expect(clap_export).to be_nil
    end
  end
end
