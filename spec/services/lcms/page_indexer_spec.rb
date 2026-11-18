# frozen_string_literal: true

require 'rails_helper'

describe Lcms::PageIndexer do
  let(:fixture_path) { Rails.root.join('spec/fixtures/lcms/sample_mz.jdx') }
  let(:raw_content) { File.binread(fixture_path) }

  let(:attachment) do
    double( # rubocop:disable RSpec/VerifiedDoubles
      'Attachment',
      id: 42,
      filename: 'sample_mz.jdx',
      updated_at: Time.zone.local(2024, 1, 1),
      abs_path: fixture_path.to_s,
      read_file: raw_content,
    )
  end

  before do
    Rails.cache.clear
  end

  describe '.build' do
    subject(:index) { described_class.build(attachment) }

    it 'returns one entry per ##PAGE block' do
      expect(index[:pages].length).to eq(3)
    end

    it 'extracts page values as floats' do
      vals = index[:pages].map { |p| p[:page_value] } # rubocop:disable Rails/Pluck -- array of hashes
      expect(vals).to eq([1.0, 2.5, 4.75])
    end

    it 'records non-overlapping byte ranges in order' do
      pages = index[:pages]
      pages.each_cons(2) do |a, b|
        expect(a[:byte_end]).to eq(b[:byte_start])
      end
      expect(pages.first[:byte_start]).to eq(index[:prefix_size])
    end

    it 'allows reconstructing the original page content from the offsets' do
      page = index[:pages].first
      slice = raw_content.byteslice(page[:byte_start], page[:byte_end] - page[:byte_start])
      expect(slice).to start_with('##PAGE=1.00')
    end

    it 'derives polarity from SCAN_MODE when filename is neutral' do
      expect(index[:polarity]).to eq('positive')
    end

    it 'returns an empty index for a nil attachment' do
      empty = described_class.build(nil)
      expect(empty[:pages]).to eq([])
    end
  end

  describe '.for' do
    it 'caches the index across calls based on attachment id and updated_at' do
      first = described_class.for(attachment)
      allow(attachment).to receive_messages(abs_path: '/nonexistent/path', read_file: '')
      second = described_class.for(attachment)

      expect(second[:pages].length).to eq(first[:pages].length)
    end
  end
end
