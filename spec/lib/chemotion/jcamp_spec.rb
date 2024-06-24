# frozen_string_literal: true

# rubocop:disable Style/WordArray

require 'rails_helper'
require 'webmock/rspec'

RSpec.describe Chemotion::Jcamp do
#  WebMock.allow_net_connect!

  Rails.configuration.spectra.chemspectra.url = 'http://localhost'
  headers = { 'Content-Type' => 'multipart/form-data' }

  match_multipart_body = ->(request) do # rubocop:disable Style/Lambda
    request.body.force_encoding('BINARY')
    request.body.include? 'Content-Type: text/plain'
  end

  describe Chemotion::Jcamp::CreateImg do
    file_path = 'spec/fixtures/upload.txt'

    before do
      stub_request(:post, 'localhost/zip_image')
        .with(
          headers: headers, &match_multipart_body
        )
        .to_return(status: 200, body: '')
    end

    xit 'stubs peak in image request' do

      response = described_class.stub_peak_in_image(file_path)

      expect(response.code).to eq(200)
      expect(response.body).not_to be_nil
    end

    it 'tests spectrum_img_gene' do
      allow(described_class).to receive(:stub_peak_in_image).and_return(
        double(:response, code: 200, body: ''), # rubocop:disable RSpec/VerifiedDoubles
      )

      result = described_class.spectrum_img_gene(file_path)

      expect(result).not_to be_nil
    end
  end

  describe Chemotion::Jcamp::CombineImg do
    file_path = 'spec/fixtures/upload.txt'

    before do
      stub_request(:post, 'localhost/combine_images')
        .with(
          headers: headers, &match_multipart_body
        )
        .to_return(status: 200, body: '')
    end

    xit 'stubs combine image request' do

      response = described_class.stub_request([file_path, file_path], 1, ['file_1', 'file_2'])

      expect(response.code).to eq(200)
      expect(response.body).not_to be_nil
    end

    it 'tests combine images' do
      allow(described_class).to receive(:stub_request).and_return(
        double(:response, code: 200, body: ''), # rubocop:disable RSpec/VerifiedDoubles
      )

      result = described_class.combine([file_path, file_path], 1, ['file_1', 'file_2'], {})

      expect(result).not_to be_nil
    end
  end
end

# rubocop:enable Style/WordArray
