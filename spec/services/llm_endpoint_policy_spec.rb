# frozen_string_literal: true

require 'rails_helper'

describe LlmEndpointPolicy do
  describe '.violation' do
    it 'accepts a public https endpoint' do
      expect(described_class.violation('https://api.openai.com/v1')).to be_nil
    end

    it 'accepts a blank endpoint, which means the protocol default' do
      expect(described_class.violation('')).to be_nil
    end

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

    context 'when a name resolves into the private space' do
      before { allow(Resolv).to receive(:getaddresses).with('sneaky.example.com').and_return(['127.0.0.1']) }

      it 'passes the name check but is refused at connect time' do
        expect(described_class.violation('http://sneaky.example.com')).to be_nil
        expect { described_class.pinned_address!('sneaky.example.com') }
          .to raise_error(Errors::LlmNotConfiguredError, /private or loopback/)
      end
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

  describe '.pinned_address!' do
    it 'pins the connection to the address it checked' do
      allow(Resolv).to receive(:getaddresses).with('api.example.com').and_return(['93.184.216.34'])

      expect(described_class.pinned_address!('api.example.com')).to eq('93.184.216.34')
    end

    it 'refuses a public name whose second address is private' do
      allow(Resolv).to receive(:getaddresses).with('mixed.example.com')
                                             .and_return(['93.184.216.34', '10.0.0.1'])

      expect { described_class.pinned_address!('mixed.example.com') }
        .to raise_error(Errors::LlmNotConfiguredError)
    end

    it 'leaves an unresolvable name to the client' do
      allow(Resolv).to receive(:getaddresses).with('nowhere.invalid').and_return([])

      expect(described_class.pinned_address!('nowhere.invalid')).to be_nil
    end

    it 'refuses a reserved literal and pins nothing for a public one' do
      expect { described_class.pinned_address!('169.254.169.254') }
        .to raise_error(Errors::LlmNotConfiguredError)
      expect(described_class.pinned_address!('93.184.216.34')).to be_nil
    end

    it 'checks nothing when the deployment allows private endpoints' do
      allow(described_class).to receive(:private_allowed?).and_return(true)

      expect(described_class.pinned_address!('127.0.0.1')).to be_nil
    end
  end
end
