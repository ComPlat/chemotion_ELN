# frozen_string_literal: true

# == Schema Information
#
# Table name: nmr_sim_nmr_simulations
#
#  id          :integer          not null, primary key
#  molecule_id :integer
#  path_1h     :text
#  path_13c    :text
#  source      :text
#  deleted_at  :datetime
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#
# Indexes
#
#  index_nmr_sim_nmr_simulations_on_deleted_at              (deleted_at)
#  index_nmr_sim_nmr_simulations_on_molecule_id_and_source  (molecule_id,source) UNIQUE
#
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

  def read_simulation_file(path)
    File.read(File.join(file_dir, path))
  end

  before { allow(Simulation::Nmrdb).to receive(:new).and_return(nmrdb) }

  after { FileUtils.remove_entry(file_dir) }

  describe 'associations' do
    it 'belongs to a molecule' do
      expect(described_class.reflect_on_association(:molecule).macro).to eq :belongs_to
    end
  end

  describe 'before_validation :path_valid_or_to_fetch' do
    context 'when no simulation files exist yet' do
      let(:simulation) { build_simulation.tap(&:save!) }

      it 'fetches the spectra from nmrdb for the molecule' do
        simulation

        expect(Simulation::Nmrdb).to have_received(:new).with(molfile: molecule.molfile).once
      end

      it 'stores both responses as json files' do
        expect(read_simulation_file(simulation.path_1h)).to eq response_1h
        expect(read_simulation_file(simulation.path_13c)).to eq response_13c
      end

      it 'names the files by a SHA256 hash' do
        expect(simulation.path_1h).to match(/\A\h{64}\.json\z/)
        expect(simulation.path_13c).not_to eq simulation.path_1h
      end
    end

    context 'when nmrdb returns no 1H response' do
      let(:response_1h) { nil }

      it 'only stores the 13C file' do
        simulation = build_simulation.tap(&:save!)

        expect(simulation.path_1h).to be_nil
        expect(read_simulation_file(simulation.path_13c)).to eq response_13c
      end
    end

    context 'when both simulation files already exist' do
      it 'does not fetch again' do
        simulation = build_simulation.tap(&:save!)
        simulation.update!(updated_at: Time.current)

        expect(Simulation::Nmrdb).to have_received(:new).once
      end
    end

    context 'when a stored file has been removed' do
      it 'fetches again and replaces the missing file' do
        simulation = build_simulation.tap(&:save!)
        FileUtils.rm(File.join(file_dir, simulation.path_13c))
        simulation.instance_variable_set(:@nmrdb, nil)
        simulation.save!

        expect(Simulation::Nmrdb).to have_received(:new).twice
        expect(read_simulation_file(simulation.path_13c)).to eq response_13c
      end
    end
  end

  describe 'validations' do
    it 'rejects a second simulation for the same molecule and source' do
      build_simulation.save!
      duplicate = build_simulation

      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:molecule_id]).to be_present
    end
  end

  describe '#result' do
    it 'returns open files for both spectra' do
      result = build_simulation.tap(&:save!).result

      expect(result[:response_1h].read).to eq response_1h
      expect(result[:response_13c].read).to eq response_13c
    ensure
      result&.each_value { |file| file&.close }
    end

    it 'returns nil for a missing spectrum' do
      simulation = build_simulation
      simulation.path_1h = 'missing.json'

      expect(simulation.result[:response_1h]).to be_nil
    end
  end

  describe '#invalid_file' do
    it 'is false when both files exist' do
      expect(build_simulation.tap(&:save!).invalid_file).to be false
    end

    it 'is truthy when a path is nil' do
      expect(build_simulation.invalid_file).to be_truthy
    end

    it 'is truthy when a file is missing on disk' do
      simulation = build_simulation.tap(&:save!)
      FileUtils.rm(File.join(file_dir, simulation.path_1h))

      expect(simulation.invalid_file).to be_truthy
    end
  end

  describe '#destroy' do
    it 'soft deletes the simulation' do
      simulation = build_simulation.tap(&:save!)
      simulation.destroy

      expect(described_class.find_by(id: simulation.id)).to be_nil
      expect(described_class.with_deleted.find(simulation.id)).to be_present
    end
  end
end
