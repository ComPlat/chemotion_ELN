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

    it 'defers the PubChem CID tag to async enrichment (not populated synchronously on create)' do
      molecule.save!
      expect(molecule.tag.taggable_data['pubchem_cid']).to be_nil
    end

    it 'backfills the PubChem CID tag idempotently via #assign_pubchem_names_and_cid!' do
      molecule.save!
      molecule.assign_pubchem_names_and_cid!(cid: '123456789', iupac_name: 'water', names: [])
      expect(molecule.reload.tag.taggable_data['pubchem_cid']).to eq('123456789')
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
      molfile_example = <<~MOL

          Ketcher 05301616272D 1   1.00000     0.00000     0

          2  1  0     0  0            999 V2000
            1.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
            0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
          1  2  1  0     0  0
        M  END
      MOL
      molecule.assign_attributes(molfile: molfile_example)
      molecule.save!
      persisted_molecule = described_class.last
      persisted_molfile_sha =
        (Digest::SHA256.new << persisted_molecule.molfile).hexdigest
      molfile_sha =
        (Digest::SHA256.new << molecule.molfile).hexdigest
      expect(persisted_molfile_sha).to eq(molfile_sha)
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
      allow(PubchemLookupJob).to receive(:perform_later) { |ids| scheduled_ids = ids }

      molecule = create(:molecule)

      expect(scheduled_ids).to eq([molecule.id])
    end
  end

  describe '#skip_lcss_callback' do
    it 'suppresses automatic scheduling when set true before create' do
      allow(PubchemLookupJob).to receive(:perform_later)

      build(:molecule, skip_lcss_callback: true).save!

      expect(PubchemLookupJob).not_to have_received(:perform_later)
    end
  end

  describe '.schedule_lcss_batch' do
    it 'schedules one job covering every given id' do
      first_molecule = create(:molecule, skip_lcss_callback: true)
      second_molecule = create(:molecule, skip_lcss_callback: true)
      scheduled_ids = nil
      allow(PubchemLookupJob).to receive(:perform_later) { |ids| scheduled_ids = ids }

      described_class.schedule_lcss_batch([first_molecule.id, second_molecule.id])

      expect(PubchemLookupJob).to have_received(:perform_later).once
      expect(scheduled_ids).to contain_exactly(first_molecule.id, second_molecule.id)
    end

    it 'only schedules ids that still exist' do
      survivor = create(:molecule, skip_lcss_callback: true)
      doomed = create(:molecule, skip_lcss_callback: true)
      doomed.destroy!
      scheduled_ids = nil
      allow(PubchemLookupJob).to receive(:perform_later) { |ids| scheduled_ids = ids }

      described_class.schedule_lcss_batch([survivor.id, doomed.id])

      expect(scheduled_ids).to eq([survivor.id])
    end

    it 'schedules nothing when no given id still exists' do
      allow(PubchemLookupJob).to receive(:perform_later)

      described_class.schedule_lcss_batch([])
      described_class.schedule_lcss_batch([-1])

      expect(PubchemLookupJob).not_to have_received(:perform_later)
    end
  end

  describe '.find_or_create_by_molfile' do
    let(:babel_info) do
      { inchikey: 'NEWMOLECULE-UHFFFAOYSA-N', is_partial: false, formula: 'H2O', molfile_version: 'V2000' }
    end

    before do
      allow(Chemotion::PubchemService).to receive(:molecule_info_from_inchikey).and_return({})
    end

    it 'defers scheduling when given defer_lcss: true' do
      allow(PubchemLookupJob).to receive(:perform_later)

      described_class.find_or_create_by_molfile('molfile', defer_lcss: true, **babel_info)

      expect(PubchemLookupJob).not_to have_received(:perform_later)
    end

    it 'schedules immediately when defer_lcss is not given' do
      scheduled_ids = nil
      allow(PubchemLookupJob).to receive(:perform_later) { |ids| scheduled_ids = ids }

      molecule = described_class.find_or_create_by_molfile('molfile', **babel_info)

      expect(scheduled_ids).to eq([molecule.id])
    end

    it 'does not schedule anything when the molecule already existed, regardless of defer_lcss' do
      existing = create(
        :molecule,
        inchikey: babel_info[:inchikey],
        is_partial: false,
        sum_formular: babel_info[:formula],
        skip_lcss_callback: true,
      )
      allow(PubchemLookupJob).to receive(:perform_later)

      molecule = described_class.find_or_create_by_molfile('molfile', defer_lcss: true, **babel_info)

      expect(molecule.id).to eq(existing.id)
      expect(PubchemLookupJob).not_to have_received(:perform_later)
    end

    it 'does not call PubChem synchronously on the create path (C2: enrichment is async)' do
      allow(PubchemLookupJob).to receive(:perform_later)

      described_class.find_or_create_by_molfile('molfile', **babel_info)

      expect(Chemotion::PubchemService).not_to have_received(:molecule_info_from_inchikey)
    end

    # names is nullable but defaults to []. Deferred enrichment passes {}, and assigning nil
    # would send an explicit NULL that bypasses that default — readers index into it without
    # a nil guard (ChemicalAPI's molecule.names[0]).
    it 'stores names as an empty array, not NULL, when enrichment is deferred' do
      allow(PubchemLookupJob).to receive(:perform_later)

      molecule = described_class.find_or_create_by_molfile('molfile', **babel_info)

      expect(molecule.reload.names).to eq([])
    end

    context 'when a concurrent worker wins the create race (C1)' do
      it 're-finds the existing row instead of raising PG::UniqueViolation, without re-enqueueing LCSS' do
        existing = create(
          :molecule,
          inchikey: babel_info[:inchikey],
          is_partial: false,
          sum_formular: babel_info[:formula],
          skip_lcss_callback: true,
        )
        # Simulate the TOCTOU race: find_by misses, then the INSERT collides with the row the
        # winning worker committed in the gap.
        allow(described_class).to receive(:find_by).and_return(nil, existing)
        allow(described_class).to receive(:create).and_raise(ActiveRecord::RecordNotUnique)
        allow(PubchemLookupJob).to receive(:perform_later)

        molecule = described_class.find_or_create_by_molfile('molfile', **babel_info)

        expect(molecule.id).to eq(existing.id)
        # the losing call must NOT re-enqueue enrichment/LCSS for a row the winner already handled
        # (its own failed Molecule.create never committed, so after_create_commit never fired)
        expect(PubchemLookupJob).not_to have_received(:perform_later)
      end

      # The stubbed sibling above raises RecordNotUnique in Ruby, which never touches Postgres
      # and so cannot detect a missing savepoint. This one drives a real unique-index
      # violation from inside an enclosing transaction — the shape every transactional caller
      # has (Sample's before_save :find_or_create_molecule, ImportSamples#write_to_db,
      # ImportCollections#import). Without requires_new: true the aborted INSERT leaves the
      # outer transaction in PG::InFailedSqlTransaction and the rescue's own re-find raises.
      it 'recovers from a genuine unique-index violation inside an enclosing transaction' do
        allow(PubchemLookupJob).to receive(:perform_later)
        winner = nil

        allow(described_class).to receive(:find_by).and_wrap_original do |orig, *args|
          found = orig.call(*args)
          next found unless found.nil? && winner.nil?

          # Stand in for the competing worker committing in the TOCTOU gap: the winning row
          # is created *before* the savepoint opens, so rolling back to it leaves the row.
          winner = create(
            :molecule,
            inchikey: babel_info[:inchikey],
            is_partial: false,
            sum_formular: babel_info[:formula],
            skip_lcss_callback: true,
          )
          nil
        end

        molecule = ActiveRecord::Base.transaction do
          described_class.find_or_create_by_molfile('molfile', defer_lcss: true, **babel_info)
        end

        expect(winner).to be_present
        expect(molecule.id).to eq(winner.id)
        expect(described_class.where(inchikey: babel_info[:inchikey]).count).to eq 1
      end

      it 're-raises when the row is genuinely absent after RecordNotUnique' do
        allow(described_class).to receive(:find_by).and_return(nil, nil)
        allow(described_class).to receive(:create).and_raise(ActiveRecord::RecordNotUnique)

        expect do
          described_class.find_or_create_by_molfile('molfile', **babel_info)
        end.to raise_error(ActiveRecord::RecordNotUnique)
      end
    end
  end

  describe '.schedule_lcss_since' do
    it 'does nothing when timestamp is blank' do
      allow(PubchemLookupJob).to receive(:perform_later)

      described_class.schedule_lcss_since(nil)

      expect(PubchemLookupJob).not_to have_received(:perform_later)
    end

    it 'does nothing when no molecule was created after the given timestamp' do
      allow(PubchemLookupJob).to receive(:perform_later)

      described_class.schedule_lcss_since(1.hour.from_now)

      expect(PubchemLookupJob).not_to have_received(:perform_later)
    end

    it 'schedules a job covering molecules created after the given timestamp' do
      timestamp = 1.hour.ago
      create(:molecule)
      allow(PubchemLookupJob).to receive(:perform_later)

      described_class.schedule_lcss_since(timestamp)

      expect(PubchemLookupJob).to have_received(:perform_later).with(nil, created_after: timestamp)
    end
  end

  describe '#assign_molecule_data svg_molfile: kwarg' do
    let(:molecule) { build(:molecule) }
    let(:babel_info) do
      {
        inchi: 'InChI=...', formula: 'C6H6', mol_wt: 78.0, mass: 78.0,
        cano_smiles: 'c1ccccc1', molfile_version: 'V2000', is_partial: false,
        svg: nil, ob_log: nil
      }
    end

    it 'uses svg_molfile for SVG generation when provided' do
      original_molfile = "full-molfile-with-PolymersList\n> <PolymersList>\n0/95/1.0-1.0\n$$$$"
      partial_molfile  = 'partial-molfile-no-PolymersList'
      molecule.molfile = partial_molfile

      allow(described_class).to receive(:svg_reprocess).and_return(nil)
      molecule.assign_molecule_data(babel_info, {}, original_molfile)
      expect(described_class).to have_received(:svg_reprocess).with(nil, original_molfile)
    end

    it 'falls back to self.molfile when svg_molfile is not given' do
      molecule.molfile = 'stored-molfile'

      allow(described_class).to receive(:svg_reprocess).and_return(nil)
      molecule.assign_molecule_data(babel_info, {})
      expect(described_class).to have_received(:svg_reprocess).with(nil, 'stored-molfile')
    end

    it 'falls back to self.molfile when svg_molfile is nil explicitly' do
      molecule.molfile = 'stored-molfile'

      allow(described_class).to receive(:svg_reprocess).and_return(nil)
      molecule.assign_molecule_data(babel_info, {}, nil)
      expect(described_class).to have_received(:svg_reprocess).with(nil, 'stored-molfile')
    end

    it 'assigns molecular properties from babel_info regardless of svg_molfile' do
      allow(described_class).to receive(:svg_reprocess).and_return(nil)
      molecule.molfile = 'molfile'

      molecule.assign_molecule_data(babel_info, {})

      expect(molecule.sum_formular).to eq('C6H6')
      expect(molecule.molecular_weight).to eq(78.0)
      expect(molecule.exact_molecular_weight).to eq(78.0)
    end
  end

  describe '.find_or_create_by_molfile with polymer (svg_molfile: fix)' do
    let(:polymer_molfile) do
      <<~MOL

          Ketcher  01012012572D 1   1.00000     0.00000     0

          2  1  0  0  0  0            999 V2000
            0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
            1.2124    0.7000    0.0000 R#  0  0  0  0  0  0  0  0  0  0  0  0
          1  2  1  0     0  0
        M  RGP  1   2   1
        M  END

        > <PolymersList>
        1/95/1.00-1.00

        $$$$
      MOL
    end

    it 'passes the original molfile (with PolymersList) to assign_molecule_data as svg_molfile' do
      # Prevent actual OpenBabel / PubChem / SVG calls
      babel_info = {
        inchikey: 'TESTINCHIKEY12345-UHFFFAOYSA-N',
        inchi: 'InChI=1S/test',
        formula: 'C1',
        mol_wt: 12.0,
        mass: 12.0,
        cano_smiles: 'C',
        molfile_version: 'V2000',
        is_partial: true,
        molfile: "partial\nC atom only\nM  END\n",
        svg: nil,
        ob_log: nil,
      }

      allow(Chemotion::OpenBabelService).to receive(:molecule_info_from_molfile).and_return(babel_info)
      allow(Chemotion::PubchemService).to receive(:molecule_info_from_inchikey).and_return({})
      allow(described_class).to receive(:svg_reprocess).and_return(nil)

      described_class.find_or_create_by_molfile(polymer_molfile)
      expect(described_class).to have_received(:svg_reprocess).with(nil, polymer_molfile)
    end
  end

  describe '.find_or_create_by_molfile with ball-only polymer (null header, TextNode)' do
    let(:ball_only_molfile) do
      <<~MOL
        null
          Ketcher  6232611422D 1   1.00000     0.00000     0

          1  0  0  0  0  0  0  0  0  0999 V2000
            2.0250   -2.0250    0.0000 R#   0  0  0  0  0  0  0  0  0  0  0  0
        M  END

        > <PolymersList>
        0/95/1.00-1.00
        > <TextNode>
        0#0ce7f3#t_95_0#asdads
        > </TextNode>
        $$$$
      MOL
    end

    it 'passes the original molfile (with PolymersList and TextNode) as svg_molfile' do
      babel_info = {
        inchikey: 'BALLONLYINCHIKEY-UHFFFAOYSA-N',
        inchi: 'InChI=1S/ball',
        formula: 'C1',
        mol_wt: 12.0,
        mass: 12.0,
        cano_smiles: 'C',
        molfile_version: 'V2000',
        is_partial: true,
        molfile: "partial\nC atom only\nM  END\n",
        svg: nil,
        ob_log: nil,
      }

      allow(Chemotion::OpenBabelService).to receive(:molecule_info_from_molfile).and_return(babel_info)
      allow(Chemotion::PubchemService).to receive(:molecule_info_from_inchikey).and_return({})
      allow(described_class).to receive(:svg_reprocess).and_return(nil)

      described_class.find_or_create_by_molfile(ball_only_molfile)
      expect(described_class).to have_received(:svg_reprocess).with(nil, ball_only_molfile)
    end
  end

  describe '#assign_pubchem_names_and_cid!' do
    let(:molecule) { create(:molecule, iupac_name: nil, names: []) }

    it 'persists names/cid idempotently across repeated calls', :aggregate_failures do
      2.times do
        molecule.assign_pubchem_names_and_cid!(cid: '999', iupac_name: 'water', names: %w[aqua dihydrogen-oxide])
      end

      expect(molecule.reload.iupac_name).to eq('water')
      expect(molecule.tag.taggable_data['pubchem_cid']).to eq('999')
      expect(molecule.molecule_names.where(description: 'iupac_name').pluck(:name))
        .to contain_exactly('aqua', 'dihydrogen-oxide')
    end

    it 'does not overwrite an existing cid/name with nil', :aggregate_failures do
      molecule.assign_pubchem_names_and_cid!(cid: '999', iupac_name: 'water', names: [])

      molecule.assign_pubchem_names_and_cid!(cid: nil, iupac_name: nil, names: [])

      expect(molecule.reload.tag.taggable_data['pubchem_cid']).to eq('999')
      expect(molecule.iupac_name).to eq('water')
    end

    it 'no-ops on blank info' do
      expect { molecule.assign_pubchem_names_and_cid!({}) }.not_to(change { molecule.molecule_names.count })
    end
  end
end
