# frozen_string_literal: true

require 'rails_helper'
require_relative '../../../lib/goechem/goechem'
require_relative '../../../lib/goechem/mapper'
require_relative '../../../lib/goechem/client'
require_relative '../../../lib/goechem/sync'

# Path mirrors lib/goechem/ (module is GoeChem)
RSpec.describe GoeChem::Sync, type: :model do # rubocop:disable RSpec/SpecFilePathFormat
  # ---------------------------------------------------------------------------
  # Shared setup
  # ---------------------------------------------------------------------------
  # Sync is user-centric; it auto-creates/finds the "GoeChem Inventory" collection
  subject(:sync) { described_class.new(user_id: user.id, goechem_user_id: '10001') }

  let(:user) { create(:person) }
  # The GoeChem Inventory collection auto-created by the sync for assertions
  let(:goechem_collection) do
    sync.process
    Collection.find_by!(user_id: user.id, label: GoeChem::Sync::COLLECTION_LABEL)
  end
  let(:collection) { create(:collection, user: user) }

  # GoeChem CHEMIKALIENBESTAND rows
  let(:acetonitrile_row) do
    {
      'id' => '42',
      'cid' => '107',
      'name' => 'Acetonitrile',
      'cas' => '75-05-8',
      'casnr' => '75-05-8',
      'formel' => 'C2H3N',
      'inh' => 1750,
      'einh' => 'ML',
      'cont' => 500,
      'firma' => 'Sigma-Aldrich',
      'hersteller' => 'Merck',
      'katnr' => 'A001',
      'gebaeude' => '30.42',
      'raum' => '101',
      'platz' => 'Regal 3',
      'hhinweis' => 'H225 H302',
      'regzeit' => 1_700_000_000,
    }
  end

  let(:caffeine_row) do
    {
      'id' => '99',
      'name' => 'Caffeine',
      'cas' => '58-08-2',
      'formel' => 'C8H10N4O2',
      'inh' => 250,
      'einh' => 'G',
      'cont' => 250,
      'firma' => 'Acros',
    }
  end

  # Stub the HTTP client and PubChem — test sync logic, not network calls
  let(:mock_client) { instance_double(GoeChem::Client) }

  # Pre-seed the DUMMY molecule via raw SQL to bypass all AR callbacks (after_create :get_lcss
  # enqueues a PubChem job; if the molecule already exists find_or_create_dummy skips creation).
  def seed_dummy_molecule
    return if Molecule.exists?(inchikey: 'DUMMY')

    ActiveRecord::Base.connection.execute(
      'INSERT INTO molecules (inchikey, inchistring, sum_formular, molecular_weight, ' \
      'exact_molecular_weight, is_partial, created_at, updated_at) ' \
      "VALUES ('DUMMY', 'DUMMY', '', 0, 0, false, NOW(), NOW())",
    )
  end

  before do
    seed_dummy_molecule
    allow(GoeChem::Client).to receive(:new).and_return(mock_client)
    allow(mock_client).to receive(:chemicals).with('10001').and_return([acetonitrile_row])
    # Default: the CAS lookup resolves nothing — samples become decoupled with the dummy molecule
    allow(Chemotion::CasLookupService).to receive(:fetch_by_cas).and_return(nil)
  end

  # ---------------------------------------------------------------------------
  # CREATE path — no existing sample for this GoeChem ID
  # ---------------------------------------------------------------------------
  describe '#process — creating new records' do
    it 'creates exactly one Sample' do
      expect { sync.process }.to change(Sample, :count).by(1)
    end

    it 'creates a Chemical 1:1 with the sample' do
      expect { sync.process }.to change(Chemical, :count).by(1)
    end

    it 'links the sample to the auto-created GoeChem Inventory collection' do
      sync.process
      gc_coll = Collection.find_by!(user_id: user.id, label: GoeChem::Sync::COLLECTION_LABEL)
      expect(CollectionsSample.where(collection_id: gc_coll.id).count).to eq(1)
    end

    it 'auto-creates the GoeChem Inventory collection' do
      expect do
        sync.process
      end.to change {
        Collection.where(user_id: user.id, label: GoeChem::Sync::COLLECTION_LABEL).count
      }.by(1)
    end

    it 'returns processed=1 and no errors' do
      result = sync.process
      expect(result[:processed]).to eq(1)
      expect(result[:errors]).to be_empty
    end

    describe 'Sample attributes' do
      subject(:sample) { Sample.last }

      before { sync.process }

      it 'maps GoeChem name field' do
        expect(sample.name).to eq('Acetonitrile')
      end

      it 'mirrors volume in real_amount_value (sample list display)' do
        expect(sample.real_amount_value).to eq(1750.0)
        expect(sample.real_amount_unit).to  eq('ml')
      end

      it 'marks as inventory_sample' do
        expect(sample.inventory_sample).to be true
      end

      it 'builds location from GoeChem Gebäude/Raum/Platz' do
        expect(sample.location).to eq('Geb. 30.42, Raum 101, Platz Regal 3')
      end

      it 'stores GoeChem batch ID in xref' do
        expect(sample.xref['goechem_id']).to eq('42')
      end

      it 'stores CAS in xref' do
        expect(sample.xref['cas']).to eq('75-05-8')
      end
    end

    describe 'Chemical attributes (canonical Chemical tab fields)' do
      subject(:chemical) { Chemical.last }

      before { sync.process }

      let(:data) { chemical.chemical_data[0] }

      it 'sets cas on Chemical' do
        expect(chemical.cas).to eq('75-05-8')
      end

      it 'routes ML → chemical_data[0]["volume"] (not amount)' do
        expect(data['volume']).to eq({ 'value' => 1750.0, 'unit' => 'ml' })
      end

      it 'does not set amount for a liquid' do
        expect(data['amount']).to be_nil
      end

      it 'sets status Available (inh > 0)' do
        expect(data['status']).to eq('Available')
      end

      it 'stores firma under native GoeChem key in goechemProductInfo' do
        expect(data['goechemProductInfo']['firma']).to eq('Sigma-Aldrich')
      end

      it 'stores hersteller under native GoeChem key' do
        expect(data['goechemProductInfo']['hersteller']).to eq('Merck')
      end

      it 'stores hhinweis (raw H phrase string) under native GoeChem key' do
        expect(data['goechemProductInfo']['hhinweis']).to eq('H225 H302')
      end

      it 'stores katnr under native GoeChem key' do
        expect(data['goechemProductInfo']['katnr']).to eq('A001')
      end

      it 'populates safetyPhrases.h_statements from hhinweis codes' do
        expect(data['safetyPhrases']['h_statements'].keys).to include('H225', 'H302')
      end

      it 'populates safetyPhrases.p_statements from phinweis codes' do
        expect(data['safetyPhrases']['p_statements']).to be_a(Hash)
      end

      it 'populates safetyPhrases.pictograms as empty array' do
        expect(data['safetyPhrases']['pictograms']).to eq([])
      end
    end

    context 'with a solid chemical (G unit)' do
      subject(:data) { Chemical.last.chemical_data[0] }

      before do
        allow(mock_client).to receive(:chemicals).and_return([caffeine_row])
        sync.process
      end

      it 'routes G → chemical_data[0]["amount"]' do
        expect(data['amount']).to eq({ 'value' => 250.0, 'unit' => 'g' })
      end

      it 'does not set volume for solid' do
        expect(data['volume']).to be_nil
      end
    end
  end

  # ---------------------------------------------------------------------------
  # Molecule resolution — every sample is coupled OR decoupled, never neither
  # ---------------------------------------------------------------------------
  describe '#process — molecule resolution' do
    context 'when the CAS lookup resolves the CAS number to a molecule' do
      let!(:molecule) { create(:molecule) }

      before do
        allow(Chemotion::CasLookupService).to receive(:fetch_by_cas)
          .with('75-05-8').and_return({ smiles: 'CC#N', cas: '75-05-8', source: 'cas' })
        allow(Molecule).to receive(:find_or_create_by_cano_smiles)
          .with('CC#N').and_return(molecule)
      end

      it 'attaches the molecule to the sample' do
        sync.process
        expect(Sample.last.molecule_id).to eq(molecule.id)
      end

      it 'sets decoupled to false' do
        sync.process
        expect(Sample.last.decoupled).to be false
      end
    end

    context 'when CAS is present but the CAS lookup returns nil' do
      # default before: Chemotion::CasLookupService.fetch_by_cas returns nil

      it 'creates the sample as decoupled' do
        sync.process
        expect(Sample.last.decoupled).to be true
      end

      it 'assigns the dummy molecule so the frontend never sees molecule: null' do
        sync.process
        expect(Sample.last.molecule.inchikey).to eq('DUMMY')
      end

      it 'sets sum_formula from GoeChem formel field' do
        sync.process
        expect(Sample.last.sum_formula).to eq('C2H3N')
      end
    end

    context 'when neither CAS nor formel is present' do
      let(:no_info_row) { { 'id' => '77', 'name' => 'Mystery Compound', 'inh' => 1, 'einh' => 'G' } }

      before { allow(mock_client).to receive(:chemicals).and_return([no_info_row]) }

      it 'creates the sample as decoupled with the dummy molecule and nil sum_formula' do
        sync.process
        s = Sample.last
        expect(s.decoupled).to be true
        expect(s.molecule.inchikey).to eq('DUMMY')
        expect(s.sum_formula).to be_nil
      end
    end

    context 'when updating an existing decoupled sample' do
      let!(:goechem_coll) do
        Collection.create!(user_id: user.id, label: GoeChem::Sync::COLLECTION_LABEL, is_locked: false, shared: false)
      end

      let!(:existing_sample) do
        s = Sample.new(
          name: 'Acetonitrile', created_by: user.id, user_id: user.id,
          inventory_sample: true, xref: { 'goechem_id' => '42' },
          molecule: Molecule.find_or_create_dummy,
          decoupled: true, sum_formula: 'C2H3N'
        )
        s.collections << goechem_coll
        s.save!
        s
      end

      it 'preserves the decoupled flag on update (no molecule re-lookup)' do
        sync.process
        expect(existing_sample.reload.decoupled).to be true
        expect(Chemotion::CasLookupService).not_to have_received(:fetch_by_cas)
      end
    end

    context 'when updating an existing coupled sample' do
      let!(:molecule) { create(:molecule) }
      let!(:goechem_coll) do
        Collection.create!(user_id: user.id, label: GoeChem::Sync::COLLECTION_LABEL, is_locked: false, shared: false)
      end

      let!(:existing_sample) do
        s = Sample.new(
          name: 'Acetonitrile', created_by: user.id, user_id: user.id,
          inventory_sample: true, xref: { 'goechem_id' => '42' },
          molecule: molecule
        )
        s.collections << goechem_coll
        s.save!
        s
      end

      it 'preserves the existing molecule on update (no re-lookup)' do
        sync.process
        expect(existing_sample.reload.molecule_id).to eq(molecule.id)
        expect(Chemotion::CasLookupService).not_to have_received(:fetch_by_cas)
      end
    end
  end

  # ---------------------------------------------------------------------------
  # UPDATE path — sample already exists for this GoeChem ID
  # ---------------------------------------------------------------------------
  describe '#process — updating an existing record' do
    let!(:goechem_coll) do
      Collection.create!(
        user_id: user.id,
        label: GoeChem::Sync::COLLECTION_LABEL,
        is_locked: false,
        shared: false,
      )
    end

    let!(:existing_sample) do
      s = Sample.new(
        name: 'Acetonitrile',
        created_by: user.id,
        user_id: user.id,
        inventory_sample: true,
        xref: { 'goechem_id' => '42' },
        molecule: Molecule.find_or_create_dummy,
        decoupled: true,
        sum_formula: 'C2H3N',
      )
      s.collections << goechem_coll
      s.save!
      s
    end

    let!(:existing_chemical) do
      Chemical.create!(
        sample_id: existing_sample.id,
        cas: '75-05-8',
        chemical_data: [{
          'volume' => { 'value' => 2000.0, 'unit' => 'ml' },
          'status' => 'Available',
          'merckProductInfo' => { 'productNumber' => 'A3DA', 'vendor' => 'merck' },
          'safetyPhrases' => { 'pictograms' => ['GHS02'] },
        }],
      )
    end

    it 'does not create a duplicate Sample' do
      expect { sync.process }.not_to change(Sample, :count)
    end

    it 'does not create a duplicate Chemical' do
      expect { sync.process }.not_to change(Chemical, :count)
    end

    it 'updates volume from the new GoeChem inh value' do
      sync.process
      expect(existing_chemical.reload.chemical_data[0]['volume']).to eq({ 'value' => 1750.0, 'unit' => 'ml' })
    end

    it 'preserves merckProductInfo that was not from GoeChem' do
      sync.process
      expect(existing_chemical.reload.chemical_data[0]['merckProductInfo']).to eq(
        { 'productNumber' => 'A3DA', 'vendor' => 'merck' },
      )
    end

    it 'overlays safetyPhrases with GoeChem-derived h/p_statements (GoeChem is authoritative for safety data)' do
      sync.process
      data = existing_chemical.reload.chemical_data[0]['safetyPhrases']
      expect(data).to include('h_statements', 'p_statements', 'pictograms')
    end

    it 'overlays goechemProductInfo with latest GoeChem data (native firma key)' do
      sync.process
      expect(existing_chemical.reload.chemical_data[0]['goechemProductInfo']['firma']).to eq('Sigma-Aldrich')
    end

    it 'updates real_amount_value on the Sample to new GoeChem total' do
      sync.process
      expect(existing_sample.reload.real_amount_value).to eq(1750.0)
    end

    it 'merges new GoeChem xref keys without removing existing xref keys' do
      existing_sample.update!(xref: existing_sample.xref.merge('custom_lab_note' => 'handle with care'))
      sync.process
      expect(existing_sample.reload.xref['custom_lab_note']).to eq('handle with care')
      expect(existing_sample.reload.xref['goechem_id']).to eq('42')
    end
  end

  # ---------------------------------------------------------------------------
  # Multiple rows in one sync
  # ---------------------------------------------------------------------------
  describe '#process — syncing multiple rows' do
    before do
      allow(mock_client).to receive(:chemicals).and_return([acetonitrile_row, caffeine_row])
    end

    it 'creates one Sample per GoeChem row' do
      expect { sync.process }.to change(Sample, :count).by(2)
    end

    it 'creates one Chemical per Sample' do
      expect { sync.process }.to change(Chemical, :count).by(2)
    end

    it 'reports processed count matching row count' do
      result = sync.process
      expect(result[:processed]).to eq(2)
    end
  end

  # ---------------------------------------------------------------------------
  # Error handling — one bad row should not abort the whole sync
  # ---------------------------------------------------------------------------
  describe '#process — error isolation' do
    let(:bad_row) { { 'id' => nil, 'name' => nil, 'inh' => 'bad', 'einh' => 'ML' } }

    before do
      allow(mock_client).to receive(:chemicals).and_return([bad_row, acetonitrile_row])
    end

    it 'still processes the valid row after a bad row' do
      expect { sync.process }.to change(Sample, :count).by(1)
    end

    it 'records errors for failed rows without raising' do
      result = sync.process
      expect(result[:errors].size).to eq(1)
      expect(result[:processed]).to eq(1)
    end
  end

  # ---------------------------------------------------------------------------
  # Explicit collection targeting — basis for the per-collection rights model
  # ---------------------------------------------------------------------------
  describe '#process — with an explicit collection_id' do
    subject(:sync_with_collection) do
      described_class.new(user_id: user.id, goechem_user_id: '10001', collection_id: collection.id)
    end

    it 'places new samples in the given collection instead of GoeChem Inventory' do
      sync_with_collection.process
      expect(CollectionsSample.where(collection_id: collection.id).count).to eq(1)
    end

    it 'does not create the GoeChem Inventory collection' do
      expect do
        sync_with_collection.process
      end.not_to(change do
        Collection.where(user_id: user.id, label: GoeChem::Sync::COLLECTION_LABEL).count
      end)
    end

    it 'reports the explicit collection in the result' do
      result = sync_with_collection.process
      expect(result[:collection]).to eq({ id: collection.id, label: collection.label })
    end

    it 'matches existing samples within the explicit collection on re-sync (no duplicates)' do
      sync_with_collection.process
      expect do
        described_class.new(user_id: user.id, goechem_user_id: '10001', collection_id: collection.id).process
      end.not_to change(Sample, :count)
    end

    it "raises RecordNotFound for a collection the user doesn't own" do
      other_user  = create(:person)
      not_mine    = create(:collection, user: other_user)
      expect do
        described_class.new(user_id: user.id, goechem_user_id: '10001', collection_id: not_mine.id)
      end.to raise_error(ActiveRecord::RecordNotFound)
    end
  end
end
