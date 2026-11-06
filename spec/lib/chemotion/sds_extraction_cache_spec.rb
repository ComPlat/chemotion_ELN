# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::SdsExtractionCache do
  let(:pdf) { Rails.root.join('spec/fixtures/upload.pdf') }
  let(:key) { described_class.key(pdf) }
  let(:result) { { 'properties' => { 'flash_point' => '4 °C' }, 'diagnostics' => { 'errors' => [] } } }

  describe '.key' do
    it 'is the same for the same bytes at another path' do
      copy = described_class.root.join('copy.pdf')
      FileUtils.mkdir_p(described_class.root)
      FileUtils.cp(pdf, copy)
      expect(described_class.key(copy)).to eq(key)
    end

    it 'changes when the extractor changes' do
      before = key
      allow(described_class).to receive(:extractor_digest).and_return('0' * 16)
      expect(described_class.key(pdf)).not_to eq(before)
    end
  end

  describe '.read' do
    it 'returns what was written' do
      described_class.write(key, result)
      expect(described_class.read(key)).to eq(result)
    end

    it 'returns nil when nothing was written or the entry is unreadable', :aggregate_failures do
      expect(described_class.read(key)).to be_nil
      FileUtils.mkdir_p(described_class.root)
      File.write(described_class.entry_path(key), '{not json')
      expect(described_class.read(key)).to be_nil
    end

    it 'keeps a result without errors' do
      described_class.write(key, result)
      travel(30.days) { expect(described_class.read(key)).to eq(result) }
    end

    it 'keeps a failure only until the client may retry', :aggregate_failures do
      described_class.write(key, 'diagnostics' => { 'errors' => ['ghostscript produced no text'] })
      expect(described_class.read(key)).to be_present
      travel(described_class::FAILURE_TTL + 1.second) { expect(described_class.read(key)).to be_nil }
    end

    it 'bounds the Retry-After so a poll can read the entry and it cannot linger', :aggregate_failures do
      expect(described_class.retry_after('retry_after' => 1)).to eq(5)
      expect(described_class.retry_after('retry_after' => 3600)).to eq(60)
      expect(described_class.retry_after({})).to be_nil
    end

    it 'keeps a busy answer for the Retry-After the text service gave', :aggregate_failures do
      busy = { 'errors' => ['the PDF text service is busy, try again shortly'], 'service_unavailable' => true,
               'retry_after' => 5 }
      described_class.write(key, 'diagnostics' => busy)
      travel(4.seconds) { expect(described_class.read(key)).to be_present }
      travel(6.seconds) { expect(described_class.read(key)).to be_nil }
    end

    it 'refuses a key that could name another file', :aggregate_failures do
      expect(described_class.read('../../etc/passwd')).to be_nil
      expect { described_class.write('../../etc/passwd', result) }.to raise_error(ArgumentError)
    end
  end

  describe '.root' do
    it 'sits in the safety sheets folder, out of reach of the sheet lookups' do
      expect(described_class.root).to eq(Chemotion::GenerateFileHashUtils.safety_sheets_root.join('.extractions'))
    end
  end

  describe '.write' do
    it 'drops the entry an older extractor wrote for the same sheet', :aggregate_failures do
      stale = "#{key.split('-').first}-#{'0' * 16}"
      described_class.write(stale, result)
      described_class.write(key, result)
      expect(described_class.read(stale)).to be_nil
      expect(described_class.read(key)).to eq(result)
    end
  end
end
