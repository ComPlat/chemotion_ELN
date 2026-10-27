# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::NmrdbAPI do
  let(:user) { create(:person) }
  let(:molecule) { create(:molecule) }
  let(:file_dir) { Dir.mktmpdir }
  let(:response_1h) { '{"spinus":[1]}' }
  let(:response_13c) { '{"resultLog":"finished OK"}' }
  let(:nmrdb) { instance_double(Simulation::Nmrdb, fetch: { response_1h: response_1h, response_13c: response_13c }) }

  before do
    allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    allow_any_instance_of(NmrSimulation).to receive(:file_dir).and_return(file_dir)
    allow(Simulation::Nmrdb).to receive(:new).and_return(nmrdb)
  end

  after { FileUtils.remove_entry(file_dir) }

  describe 'GET /api/v1/simulation/nmrdb' do
    def fetch_simulation
      get '/api/v1/simulation/nmrdb', params: { molecule_id: molecule.id }
    end

    it 'returns the simulated spectra as strings' do
      fetch_simulation

      expect(response).to have_http_status :ok
      expect(parsed_json_response).to eq('response_1h' => response_1h, 'response_13c' => response_13c)
    end

    it 'reuses the stored simulation' do
      2.times { fetch_simulation }

      expect(Simulation::Nmrdb).to have_received(:new).once
      expect(NmrSimulation.where(molecule: molecule).count).to eq 1
    end

    it 'restores a soft-deleted simulation' do
      fetch_simulation
      simulation = NmrSimulation.find_by(molecule: molecule)
      simulation.destroy

      fetch_simulation

      expect(response).to have_http_status :ok
      expect(parsed_json_response['response_1h']).to eq response_1h
      expect(simulation.reload.deleted_at).to be_nil
    end
  end
end
