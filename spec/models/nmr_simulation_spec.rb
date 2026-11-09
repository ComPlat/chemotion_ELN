# frozen_string_literal: true

require 'rails_helper'

RSpec.describe NmrSimulation do
  let(:molecule) { create(:molecule) }
  let(:file_dir) { Dir.mktmpdir }
  let(:response_1h) { '{"spinus":[1]}' }
  let(:response_13c) { '{"resultLog":"finished OK"}' }
  let(:nmrdb) { instance_double(Simulation::Nmrdb, fetch: { response_1h: response_1h, response_13c: response_13c }) }

  def build_simulation(**attributes)
    simulation = described_class.new(molecule: molecule, source: 'nmrdb', **attributes)
    allow(simulation).to receive(:file_dir).and_return(file_dir)
    simulation
  end

  before { allow(Simulation::Nmrdb).to receive(:new).and_return(nmrdb) }

  after { FileUtils.remove_entry(file_dir) }

  describe 'validations' do
    it 'reports a missing molecule instead of fetching' do
      simulation = build_simulation(molecule: nil)

      expect(simulation).not_to be_valid
      expect(simulation.errors[:molecule]).to be_present
      expect(Simulation::Nmrdb).not_to have_received(:new)
    end

    it 'reports a missing source instead of fetching' do
      simulation = build_simulation(source: nil)

      expect(simulation).not_to be_valid
      expect(simulation.errors[:source]).to be_present
      expect(Simulation::Nmrdb).not_to have_received(:new)
    end

    it 'only accepts supported sources' do
      simulation = build_simulation(source: 'molecule')

      expect(simulation).not_to be_valid
      expect(simulation.errors[:source]).to be_present
    end

    it 'rejects a second simulation for the same molecule and source' do
      build_simulation.save!
      duplicate = build_simulation

      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:molecule_id]).to be_present
    end

    it 'rejects a new simulation while a soft-deleted one exists for the same molecule and source' do
      build_simulation.tap(&:save!).destroy
      duplicate = build_simulation

      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:molecule_id]).to be_present
    end
  end

  describe 'storing the fetched spectra' do
    it 'creates the simulation directory if it does not exist yet' do
      FileUtils.remove_entry(file_dir)
      simulation = build_simulation.tap(&:save!)

      expect(File.read(File.join(file_dir, simulation.path_1h))).to eq response_1h
    end
  end

  describe '#result' do
    it 'returns the contents of both spectra' do
      result = build_simulation.tap(&:save!).result

      expect(result).to eq(response_1h: response_1h, response_13c: response_13c)
    end

    it 'returns nil for a missing spectrum' do
      simulation = build_simulation
      simulation.path_1h = 'missing.json'

      expect(simulation.result[:response_1h]).to be_nil
    end
  end
end
