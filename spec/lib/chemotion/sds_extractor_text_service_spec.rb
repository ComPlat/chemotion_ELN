# frozen_string_literal: true

require 'rails_helper'

# With config/sds_text_service.yml naming a url, the text layer comes from that service and
# ghostscript never runs in the app; without it, the app runs ghostscript itself.
RSpec.describe Chemotion::SdsExtractor do
  include SdsSheetHelpers

  let(:dir) { Dir.mktmpdir('sds_text_service') }
  let(:endpoint) { 'http://pdftext:8080/text' }
  let(:pdf_bytes) { "%PDF-1.4\n% stand-in, the service is stubbed\n" }
  let(:pdf) { File.join(dir, 'sheet.pdf').tap { |path| File.binwrite(path, pdf_bytes) } }
  let(:sheet_text) do
    ['SAFETY DATA SHEET', 'SECTION 1: Identification', 'Sigma-Aldrich',
     'SECTION 2: Hazards identification', '2.2 Label elements',
     'Hazard statements', 'H225 Highly flammable liquid and vapour.',
     'Precautionary statements', 'P210 Keep away from heat.', '2.3 Other hazards',
     *(3..8).map { |number| "SECTION #{number}: Section" },
     'SECTION 9: Physical and chemical properties',
     'Melting point/freezing point       :  -114 °C', 'Flash point        :  13 °C'].join("\n")
  end
  let(:diagnostics) { result['diagnostics'] }

  def configure(url:, timeout: 25)
    settings = ActiveSupport::OrderedOptions.new
    settings.url = url
    settings.timeout = timeout
    allow(Rails.configuration).to receive(:sds_text_service).and_return(settings)
  end

  before { allow(Open3).to receive(:capture3).and_call_original }

  after { FileUtils.rm_rf(dir) }

  context 'when a text service is configured' do
    before { configure(url: 'http://pdftext:8080') }

    context 'when it answers with the text' do
      let!(:request) do
        stub_request(:post, endpoint)
          .with(body: pdf_bytes, headers: { 'Content-Type' => 'application/pdf' })
          .to_return(status: 200, body: sheet_text, headers: { 'Content-Type' => 'text/plain; charset=utf-8' })
      end
      let(:result) { described_class.extract(pdf) }

      it 'reads the sheet from it without running ghostscript', :aggregate_failures do
        expect(result['safetyPhrases']['h_statements'].keys).to eq(%w[H225])
        expect(result['safetyPhrases']['p_statements'].keys).to eq(%w[P210])
        expect(result['properties']).to include('melting_point' => '-114 °C', 'flash_point' => '13 °C')
        expect(request).to have_been_requested.once
        expect(Open3).not_to have_received(:capture3)
      end

      it 'says where the text came from, without the service address', :aggregate_failures do
        expect(diagnostics['notes']).to include('text read by the PDF text service')
        expect(diagnostics.to_json).not_to include('pdftext:8080')
      end
    end

    context 'when it cut the text short' do
      before do
        stub_request(:post, endpoint).to_return(status: 200, body: sheet_text, headers: { 'X-Truncated' => '1' })
      end

      let(:result) { described_class.extract(pdf) }

      it 'still reads what came back and notes the cut', :aggregate_failures do
        expect(result['safetyPhrases']['h_statements'].keys).to eq(%w[H225])
        expect(diagnostics['notes']).to include('the PDF text service cut the text short')
      end
    end

    {
      429 => 'the PDF text service is busy, try again shortly',
      504 => 'ghostscript timed out',
      413 => 'the safety data sheet is too large for the PDF text service',
      415 => 'the PDF text service did not accept the file as a PDF',
      500 => 'the PDF text service answered HTTP 500',
    }.each do |status, message|
      context "when it answers #{status}" do
        before { stub_request(:post, endpoint).to_return(status: status, body: "whatever\n") }

        let(:result) { described_class.extract(pdf) }

        it 'reports it and does not fall back to ghostscript', :aggregate_failures do
          expect(diagnostics['errors']).to eq([message])
          expect(result['properties']).to eq({})
          expect(Open3).not_to have_received(:capture3)
        end
      end
    end

    context 'when ghostscript failed in the service' do
      before do
        stub_request(:post, endpoint).to_return(status: 422, body: "ghostscript failed: Unrecoverable error\nmore\n")
      end

      it 'passes its first line on' do
        expect(described_class.extract(pdf)['diagnostics']['errors'])
          .to eq(['ghostscript failed: Unrecoverable error'])
      end
    end

    context 'when it cannot be reached' do
      before { stub_request(:post, endpoint).to_raise(Errno::ECONNREFUSED) }

      let(:result) { described_class.extract(pdf) }

      it 'reports it unavailable and does not fall back to ghostscript', :aggregate_failures do
        expect(diagnostics['errors']).to eq(['the PDF text service is unavailable'])
        expect(Open3).not_to have_received(:capture3)
      end
    end

    context 'when it does not answer in time' do
      before { stub_request(:post, endpoint).to_timeout }

      it 'reports the timeout' do
        expect(described_class.extract(pdf)['diagnostics']['errors']).to eq(['the PDF text service timed out'])
      end
    end

    context 'when the service url ends with a slash' do
      before do
        configure(url: 'http://pdftext:8080/')
        stub_request(:post, endpoint).to_return(status: 200, body: sheet_text)
      end

      it 'still posts to /text' do
        described_class.extract(pdf)
        expect(a_request(:post, endpoint)).to have_been_made.once
      end
    end
  end

  context 'when no text service is configured' do
    let(:real_pdf) { sds_pdf_from_lines(sheet_text.split("\n"), dir: dir) }

    before do
      real_pdf
      configure(url: nil)
    end

    it 'runs ghostscript in the app as before', :aggregate_failures do
      result = described_class.extract(real_pdf)
      expect(Open3).to have_received(:capture3).with('timeout', any_args)
      expect(result['safetyPhrases']['h_statements'].keys).to eq(%w[H225])
      expect(result['diagnostics']['notes']).not_to include('text read by the PDF text service')
      expect(a_request(:post, endpoint)).not_to have_been_made
    end
  end
end
