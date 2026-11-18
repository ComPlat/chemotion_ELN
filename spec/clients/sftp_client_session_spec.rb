# frozen_string_literal: true

require 'rails_helper'

RSpec.describe SFTPClient do
  describe 'errors raised during a session' do
    subject(:client) { described_class.new('127.0.0.1', 'user', password: 'secret') }

    it 'wraps a connection error in an SFTPClientError' do
      allow(Net::SFTP).to receive(:start).and_raise(Errno::ECONNREFUSED)

      expect { client.open? }.to raise_error(SFTPClientError)
    end

    it 'lets a job timeout through' do
      allow(Net::SFTP).to receive(:start).and_raise(Delayed::WorkerTimeout)

      expect { client.open? }.to raise_error(Delayed::WorkerTimeout)
    end

    it 'lets a shutdown signal through' do
      allow(Net::SFTP).to receive(:start).and_raise(SignalException, 'TERM')

      expect { client.open? }.to raise_error(SignalException)
    end
  end
end
