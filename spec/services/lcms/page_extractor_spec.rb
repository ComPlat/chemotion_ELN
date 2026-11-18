# frozen_string_literal: true

require 'rails_helper'

describe Lcms::PageExtractor do
  let(:fixture_path) { Rails.root.join('spec/fixtures/lcms/sample_mz.jdx') }

  let(:attachment) do
    double( # rubocop:disable RSpec/VerifiedDoubles
      'Attachment',
      id: 7,
      filename: 'sample_mz.jdx',
      updated_at: Time.zone.local(2024, 1, 1),
      abs_path: fixture_path.to_s,
      read_file: File.binread(fixture_path),
    )
  end

  let(:index) { Lcms::PageIndexer.build(attachment) }

  it 'returns a self-contained JCamp string for the requested page', :aggregate_failures do
    page = index[:pages][1]
    jcamp = described_class.extract(attachment, page, prefix_size: index[:prefix_size])

    expect(jcamp).to be_a(String)
    expect(jcamp).to start_with('##TITLE=')
    expect(jcamp).to include('##PAGE=2.5')
    expect(jcamp.scan(/^##PAGE=/).length).to eq(1)
    expect(jcamp).to end_with("##END=\n")
  end

  it 'returns nil and does not raise when offsets are invalid' do
    bogus_page = { page_value: 0.0, byte_start: 0, byte_end: 0 }
    expect(described_class.extract(attachment, bogus_page, prefix_size: 0)).to be_nil
  end
end
