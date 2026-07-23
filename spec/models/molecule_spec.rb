# frozen_string_literal: true

# == Schema Information
#
# Table name: molecules
#
#  id                     :integer          not null, primary key
#  boiling_point          :float
#  cano_smiles            :string
#  cas                    :text
#  deleted_at             :datetime
#  density                :float            default(0.0)
#  exact_molecular_weight :float
#  inchikey               :string
#  inchistring            :string
#  is_partial             :boolean          default(FALSE), not null
#  iupac_name             :string
#  melting_point          :float
#  molecular_weight       :float
#  molecule_svg_file      :string
#  molfile                :binary
#  molfile_version        :string(20)
#  names                  :string           default([]), is an Array
#  sum_formular           :string
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#
# Indexes
#
#  index_molecules_on_deleted_at                           (deleted_at)
#  index_molecules_on_formula_and_inchikey_and_is_partial  (inchikey,sum_formular,is_partial) UNIQUE
#
require 'rails_helper'
require 'digest'

RSpec.describe Molecule, type: :model do
  describe 'creation' do
    let(:molecule) { create(:molecule) }

    it 'is possible to create a valid molecule' do
      expect(molecule.valid?).to be(true)
    end

    it 'has a unique inchikey' do
      molecule.save!
      invalid_molecule = described_class.new
      invalid_molecule.inchikey = molecule.inchikey
      invalid_molecule.sum_formular = molecule.sum_formular
      invalid_molecule.is_partial = molecule.is_partial
      expect { invalid_molecule.save! }.to raise_error(ActiveRecord::RecordNotUnique)
    end

    it 'have a tag with CID' do
      molecule.save!
      expect(molecule.tag.taggable_data['pubchem_cid']).to eq('123456789')
    end

    it 'has molecule_names' do
      association_names = molecule.molecule_names.map(&:name)
      database_names    = molecule.names

      expect(association_names).to include molecule.sum_formular
      expect(database_names).to match_array(association_names.without(molecule.sum_formular))
    end
  end

  describe '#delete' do
    let(:molecule) { create(:molecule) }

    it 'deletes the molecule' do
      molecule.delete
      expect(described_class.where(id: molecule.id).count).to eq(0)
    end

    it 'modifies the inchikey' do
      id = molecule.id
      inchikey = molecule.inchikey
      molecule.save!
      molecule.destroy!
      deleted_molecule = described_class.only_deleted.find_by(id: id)
      expect(deleted_molecule&.inchikey).to start_with("#{id}_")
      expect(deleted_molecule&.inchikey).to end_with(inchikey)
    end
  end

  describe 'persistance' do
    let(:molecule) { build(:molecule) }

    it 'persists array of names' do
      molecule.names = %w[foo bar quz]
      molecule.save!
      persisted_molecule = described_class.last
      expect(persisted_molecule.names).to match_array(molecule.names)
    end

    it 'persists the binary molfile' do
      molfile_example = "\n  Ketcher 05301616272D 1   1.00000     0.00000     0\n\n  2  1  0     0  0            999 V2000\n    1.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\nM  END\n" # File.open("spec/models/molecule_spec.rb", "rb")
      molecule.assign_attributes(molfile: molfile_example)
      molecule.save!
      persisted_molecule = described_class.last
      persisted_molfile_SHA =
        (Digest::SHA256.new << persisted_molecule.molfile).hexdigest
      molfile_SHA =
        (Digest::SHA256.new << molecule.molfile).hexdigest
      expect(persisted_molfile_SHA).to be === molfile_SHA
    end

    it 'updates LCSS when molecule.pubchem_lcss is requested' do
      molecule.save!
      persisted_molecule = described_class.last

      # lcss is updated as nil because cid 123456789 has no PubChem lcss
      persisted_molecule.pubchem_lcss
      expect(persisted_molecule.tag.taggable_data['pubchem_lcss']).to be_nil

      # lcss is updated with value because cid 643785 has PubChem lcss
      persisted_molecule.tag.taggable_data['pubchem_cid'] = 643_785
      persisted_molecule.pubchem_lcss
      expect(persisted_molecule.tag.taggable_data['pubchem_lcss']).not_to be_nil
    end
  end

  describe '#get_lcss' do
    it 'schedules a single-element batch for a normally-created molecule' do
      scheduled_ids = nil
      allow(PubchemSingleLcssJob).to receive(:perform_later) { |ids| scheduled_ids = ids }

      molecule = create(:molecule)

      expect(scheduled_ids).to eq([molecule.id])
    end
  end

  describe '#skip_lcss_callback' do
    it 'suppresses automatic scheduling when set true before create' do
      allow(PubchemSingleLcssJob).to receive(:perform_later)

      build(:molecule, skip_lcss_callback: true).save!

      expect(PubchemSingleLcssJob).not_to have_received(:perform_later)
    end
  end

  describe '.schedule_lcss_batch' do
    it 'schedules one job covering every given id' do
      first_molecule = create(:molecule, skip_lcss_callback: true)
      second_molecule = create(:molecule, skip_lcss_callback: true)
      scheduled_ids = nil
      allow(PubchemSingleLcssJob).to receive(:perform_later) { |ids| scheduled_ids = ids }

      described_class.schedule_lcss_batch([first_molecule.id, second_molecule.id])

      expect(PubchemSingleLcssJob).to have_received(:perform_later).once
      expect(scheduled_ids).to contain_exactly(first_molecule.id, second_molecule.id)
    end

    it 'only schedules ids that still exist' do
      survivor = create(:molecule, skip_lcss_callback: true)
      doomed = create(:molecule, skip_lcss_callback: true)
      doomed.destroy!
      scheduled_ids = nil
      allow(PubchemSingleLcssJob).to receive(:perform_later) { |ids| scheduled_ids = ids }

      described_class.schedule_lcss_batch([survivor.id, doomed.id])

      expect(scheduled_ids).to eq([survivor.id])
    end

    it 'schedules nothing when no given id still exists' do
      allow(PubchemSingleLcssJob).to receive(:perform_later)

      described_class.schedule_lcss_batch([])
      described_class.schedule_lcss_batch([-1])

      expect(PubchemSingleLcssJob).not_to have_received(:perform_later)
    end
  end

  describe '.find_or_create_by_molfile' do
    let(:babel_info) do
      { inchikey: 'NEWMOLECULE-UHFFFAOYSA-N', is_partial: false, formula: 'H2O', molfile_version: 'V2000' }
    end

    before do
      allow(Chemotion::PubchemService).to receive(:molecule_info_from_inchikey).and_return({})
    end

    it 'defers scheduling and collects the new id when given lcss_batch:' do
      lcss_batch = []
      allow(PubchemSingleLcssJob).to receive(:perform_later)

      molecule = described_class.find_or_create_by_molfile('molfile', lcss_batch: lcss_batch, **babel_info)

      expect(lcss_batch).to eq([molecule.id])
      expect(PubchemSingleLcssJob).not_to have_received(:perform_later)
    end

    it 'schedules immediately when lcss_batch is not given' do
      scheduled_ids = nil
      allow(PubchemSingleLcssJob).to receive(:perform_later) { |ids| scheduled_ids = ids }

      molecule = described_class.find_or_create_by_molfile('molfile', **babel_info)

      expect(scheduled_ids).to eq([molecule.id])
    end

    it 'does not push to lcss_batch when the molecule already existed' do
      existing = create(
        :molecule,
        inchikey: babel_info[:inchikey],
        is_partial: false,
        sum_formular: babel_info[:formula],
        skip_lcss_callback: true,
      )
      lcss_batch = []

      molecule = described_class.find_or_create_by_molfile('molfile', lcss_batch: lcss_batch, **babel_info)

      expect(molecule.id).to eq(existing.id)
      expect(lcss_batch).to be_empty
    end
  end
end
