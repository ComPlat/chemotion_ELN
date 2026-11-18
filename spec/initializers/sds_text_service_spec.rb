# frozen_string_literal: true

require 'rails_helper'

# Loads config/initializers/sds_text_service.rb against a stubbed yml: a file that is present
# but unusable must not stop the app from booting, and must not quietly mean "run gs here".
RSpec.describe 'config/initializers/sds_text_service' do # rubocop:disable RSpec/DescribeClass
  let(:yml) { Rails.root.join('config/sds_text_service.yml') }
  let(:settings) { Rails.configuration.sds_text_service }

  around do |example|
    original = Rails.configuration.sds_text_service
    example.run
  ensure
    Rails.configuration.sds_text_service = original
  end

  def boot(present: true, config: nil)
    stub_yml(present, config)
    allow(Rails.logger).to receive(:warn)
    load Rails.root.join('config/initializers/sds_text_service.rb').to_s
  end

  def stub_yml(present, config)
    allow(File).to receive(:exist?).and_call_original
    allow(File).to receive(:exist?).with(yml).and_return(present)
    allow(Rails.application).to receive(:config_for).and_call_original
    allow(Rails.application).to receive(:config_for).with(:sds_text_service).and_return(config)
  end

  def options(**values)
    ActiveSupport::OrderedOptions.new.merge!(values)
  end

  context 'without a yml' do
    before { boot(present: false) }

    it 'leaves Ghostscript running locally', :aggregate_failures do
      expect(settings.url).to be_nil
      expect(settings.misconfigured).to be_falsey
    end
  end

  context 'with a yml that holds nothing for this environment' do
    before { boot(config: nil) }

    it 'boots and marks the service misconfigured', :aggregate_failures do
      expect(settings.misconfigured).to be(true)
      expect(settings.url).to be_nil
      expect(Rails.logger).to have_received(:warn).with(/sds_text_service/)
    end
  end

  ['pdftext:8080', 'ftp://pdftext:8080', 'http://', 'http://pdf text:8080'].each do |url|
    context "with the url #{url.inspect}" do
      before { boot(config: options(url: url)) }

      it 'marks the service misconfigured' do
        expect(settings.misconfigured).to be(true)
      end
    end
  end

  [['abc', true], [0, true], ['45', false]].each do |timeout, misconfigured|
    context "with the timeout #{timeout.inspect}" do
      before { boot(config: options(url: 'http://pdftext:8080', timeout: timeout)) }

      it(misconfigured ? 'marks the service misconfigured' : 'reads it as seconds') do
        if misconfigured
          expect(settings.misconfigured).to be(true)
        else
          expect(settings.timeout).to eq(45)
        end
      end
    end
  end

  context 'with an empty url' do
    before { boot(config: options(url: nil)) }

    it 'leaves Ghostscript running locally', :aggregate_failures do
      expect(settings.url).to be_blank
      expect(settings.misconfigured).to be_falsey
    end
  end

  context 'with a valid url' do
    before { boot(config: options(url: 'http://pdftext:8080')) }

    it 'keeps it, with the default timeout', :aggregate_failures do
      expect(settings.url).to eq('http://pdftext:8080')
      expect(settings.timeout).to eq(30)
      expect(settings.misconfigured).to be_falsey
      expect(settings.desc).to eq('service hosted at: http://pdftext:8080')
    end
  end
end
