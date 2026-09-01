# frozen_string_literal: true

require 'rails_helper'

describe LlmEndpointPolicy do
  describe '.violation' do
    it 'accepts a public https endpoint' do
      expect(described_class.violation('https://api.openai.com/v1')).to be_nil
    end

    it 'accepts a blank endpoint, which means the protocol default' do
      expect(described_class.violation('')).to be_nil
    ends

    it 'refuses a scheme the client cannot speak' do
      expect(described_class.violation('file:///etc/passwd')).to include('http')
    end

    it 'refuses a URL with no host' do
      expect(described_class.violation('api.openai.com/v1')).to include('http')
    end

    it 'refuses loopback by name' do
      expect(described_class.violation('http://localhost:11434')).to include('private')
    end

    it 'refuses loopback by address' do
      expect(described_class.violation('http://127.0.0.1:11434')).to include('private')
    end

    it 'refuses the link-local metadata address' do
      expect(described_class.violation('http://169.254.169.254/latest/meta-data')).to include('private')
    end

    it 'refuses the RFC1918 space' do
      expect(described_class.violation('http://10.0.0.5:8000')).to include('private')
      expect(described_class.violation('http://192.168.1.10')).to include('private')
      expect(described_class.violation('http://172.16.4.4')).to include('private')
    end

    it 'refuses an IPv6 loopback literal, bracketed as a URL carries it' do
      expect(described_class.violation('http://[::1]:11434')).to include('private')
    end

    it 'refuses an IPv4-mapped IPv6 loopback' do
      expect(described_class.violation('http://[::ffff:127.0.0.1]')).to include('private')
    end

    it 'refuses names on the local network' do
      expect(described_class.violation('http://ollama.internal')).to include('private')
      expect(described_class.violation('http://metadata.google.internal')).to include('private')
    end

    context 'when the deployment allows private endpoints' do
      before { allow(described_class).to receive(:private_allowed?).and_return(true) }

      it 'accepts a local model server' do
        expect(described_class.violation('http://localhost:11434')).to be_nil
      end

      it 'still refuses an unusable URL' do
        expect(described_class.violation('ftp://example.com')).to include('http')
      end
    end
  end
end
