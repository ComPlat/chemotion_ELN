# frozen_string_literal: true

require 'rails_helper'

RSpec.describe SdsExtractionJob do
  let(:link) { '/safety_sheets/merck/392693_c4f307a89d9fd8c2.pdf' }
  let(:pdf) { Rails.root.join('spec/fixtures/upload.pdf') }
  let(:key) { Chemotion::SdsExtractionCache.key(pdf) }
  let(:result) { { 'properties' => {}, 'diagnostics' => { 'notes' => [], 'errors' => [] } } }

  before { allow(Chemotion::SdsExtractor).to receive(:saved_sheet_path).with(link).and_return(pdf) }

  describe '#perform' do
    it 'stores what the extractor read from the file the link names' do
      allow(Chemotion::SdsExtractor).to receive(:extract).with(pdf.to_s).and_return(result)
      described_class.perform_now(link, key)
      expect(Chemotion::SdsExtractionCache.read(key)).to eq(result)
    end

    it 'stores a failure when the link no longer names a file', :aggregate_failures do
      allow(Chemotion::SdsExtractor).to receive(:saved_sheet_path).with(link).and_return(Pathname('/nonexistent.pdf'))
      allow(Chemotion::SdsExtractor).to receive(:extract)
      described_class.perform_now(link, key)
      expect(Chemotion::SdsExtractionCache.read(key)['diagnostics']['errors']).to eq([described_class::GONE])
      expect(Chemotion::SdsExtractor).not_to have_received(:extract)
    end

    it 'does not read a sheet already in the cache' do
      Chemotion::SdsExtractionCache.write(key, result)
      allow(Chemotion::SdsExtractor).to receive(:extract)
      described_class.perform_now(link, key)
      expect(Chemotion::SdsExtractor).not_to have_received(:extract)
    end

    it 'stores a fixed reason when the extractor raises', :aggregate_failures do
      allow(Chemotion::SdsExtractor).to receive(:extract).and_raise(StandardError, 'boom at /srv/secret')
      expect { described_class.perform_now(link, key) }.not_to raise_error
      expect(Chemotion::SdsExtractionCache.read(key)['diagnostics']['errors'])
        .to eq([described_class::UNREADABLE])
    end
  end

  describe '.pending?' do
    it 'finds a queued run for the same sheet only', :aggregate_failures do
      described_class.perform_later(link, key)
      expect(described_class.pending?(key)).to be true
      expect(described_class.pending?("#{'f' * 64}-#{'0' * 16}")).to be false
    end

    it 'ignores a run whose worker died holding the lock', :aggregate_failures do
      described_class.perform_later(link, key)
      job = Delayed::Job.find_by('handler LIKE ?', "%#{key}%")
      job.update!(locked_at: 1.minute.ago, locked_by: 'host:a pid:1')
      expect(described_class.pending?(key)).to be true
      job.update!(locked_at: (described_class::STALE_LOCK + 1.minute).ago)
      expect(described_class.pending?(key)).to be false
    end

    it 'queues ahead of batch work' do
      described_class.perform_later(link, key)
      expect(Delayed::Job.find_by('handler LIKE ?', "%#{key}%").priority).to be < 0
    end

    it 'ignores a run that delayed_job gave up on' do
      described_class.perform_later(link, key)
      Delayed::Job.where('handler LIKE ?', "%#{key}%").find_each { |job| job.update!(failed_at: Time.current) }
      expect(described_class.pending?(key)).to be false
    end
  end
end
