# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::IconNmrAPI, if: ENV['DOCKER'] do
  context 'authorized user logged in' do
    let(:user) { create(:user) }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    end

    describe 'POST /api/v1/icon_nmr/config' do
      let(:client) { SFTPClient.with_default_settings }
      let(:params) do
        {
          'sample_id' => 48,
          'data' => {
            'HOLDER' => 8,
            'EXPERIMENT' => 'CMC_PROTON'
          }
        }
      end
      let(:time) { Time.now }
      let(:upload_path) { "uploads/#{time.utc.strftime('%Y-%m-%d-%H%M%S')}-48" }

      before do
        allow(Time).to receive(:now).and_return(time)
        post '/api/v1/icon_nmr/config', params
      end

      after do
        client.remove_file!(upload_path)
      end

      it 'creates a config file on the defined SFTP server' do
        content = client.read_file(upload_path)
        expect(content).to include('HOLDER 8')
        expect(content).to include('EXPERIMENT CMC_PROTON')
      end
    end
  end
end
