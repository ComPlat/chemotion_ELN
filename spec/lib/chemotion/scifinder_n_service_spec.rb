# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::ScifinderNService do
  describe '.provider_builder' do
    let(:metadata_url) { 'https://fake-scifinder.test/fake/metadata' }
    let(:provider) do
      {
        metadata: 'fake/metadata',
        host: 'https://fake-scifinder.test',
        client_id: 'fake-client-id',
        redirect: 'fake_callback',
        redirect_host: 'https://fake-eln.test/',
      }
    end
    let(:middleware) { Rails.application.config.middleware }
    let(:valid_metadata) do
      {
        status: 200,
        headers: { 'Content-Type' => 'application/json;charset=iso-8859-1', 'Location' => 'https://fake-sso.test' },
        body: { authorization_endpoint: '/fake/authorize', token_endpoint: '/fake/token' }.to_json,
      }
    end

    around do |example|
      original = Rails.configuration.try(:sfn_config)
      Rails.configuration.sfn_config = ActiveSupport::OrderedOptions.new
      Rails.configuration.sfn_config.provider = provider
      example.run
    ensure
      Rails.configuration.sfn_config = original
    end

    before do
      allow(middleware).to receive(:use)
      allow(Rails.logger).to receive(:warn)
    end

    shared_examples 'disables SciFinder-n' do |message|
      it 'clears the provider without raising' do
        expect { described_class.provider_builder }.not_to raise_error
        expect(Rails.configuration.sfn_config.provider).to be_nil
        expect(middleware).not_to have_received(:use)
      end

      it 'logs the reason' do
        described_class.provider_builder

        expect(Rails.logger).to have_received(:warn).with(message)
      end
    end

    context 'when CAS answers 200 with an HTML bot-challenge page' do
      before do
        stub_request(:get, metadata_url).to_return(
          status: 200,
          headers: { 'Content-Type' => 'text/html' },
          body: '<html><body>fake bot challenge</body></html>',
        )
      end

      it_behaves_like 'disables SciFinder-n', 'SciFinder-n disabled: unexpected metadata: HTTP 200 text/html'
    end

    context 'when CAS answers with an error status' do
      before { stub_request(:get, metadata_url).to_return(status: 503) }

      it_behaves_like 'disables SciFinder-n', 'SciFinder-n disabled: unexpected metadata: HTTP 503'
    end

    context 'when the metadata request fails' do
      before { stub_request(:get, metadata_url).to_timeout }

      it_behaves_like 'disables SciFinder-n', 'SciFinder-n disabled: metadata request failed'
    end

    context 'when scifinder_n.yml has a malformed redirect_host' do
      let(:provider) { super().merge(redirect_host: 'https://fake bad host/') }

      before { stub_request(:get, metadata_url).to_return(valid_metadata) }

      it_behaves_like 'disables SciFinder-n', /\ASciFinder-n disabled: URI::InvalidURIError: /
    end

    context 'when CAS answers with the documented metadata' do
      before { stub_request(:get, metadata_url).to_return(valid_metadata) }

      it 'stores the endpoints and registers the OmniAuth provider' do
        described_class.provider_builder

        expect(Rails.configuration.sfn_config.provider).to include(
          sso: 'https://fake-sso.test',
          authorization_endpoint: '/fake/authorize',
          token_endpoint: '/fake/token',
        )
        expect(middleware).to have_received(:use).with(OmniAuth::Builder)
      end
    end
  end
end
