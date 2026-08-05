# frozen_string_literal: true

require 'rails_helper'

# Covers the failure-isolation behaviour of the XLSX sample import: a single bad row must not take
# down the worker, poison the transaction, or vanish without a report.
RSpec.describe Import::ImportSamples do
  let(:user_id) { create(:user).id }
  let(:collection_id) { create(:collection).id }
  let(:attachment) do
    create(:attachment, :with_sample_import_template, created_by: user_id, created_for: user_id)
  end
  let(:importer) { described_class.new(attachment, collection_id, user_id, attachment.filename, 'sample') }

  # Same PubChem stub the main import spec uses, so molecule creation stays offline.
  def stub_rest_request(identifier)
    stub_request(:get, "http://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchikey/#{identifier}/record/JSON")
      .with(
        headers: {
          'Accept' => '*/*',
          'Accept-Encoding' => 'gzip;q=1.0,deflate;q=0.6,identity;q=0.3',
          'Content-Type' => 'text/json',
          'User-Agent' => 'Ruby',
        },
      )
      .to_return(status: 200, body: '', headers: {})
  end

  before do
    %w[
      BYHVGQHIAFURIL-UHFFFAOYSA-N PNNRZXFUPQQZSO-UHFFFAOYSA-N UHOVQNZJYSORNB-UHFFFAOYSA-N
      YMWUJEATGCHHMB-UHFFFAOYSA-N QPUYECUOLPXSFR-UHFFFAOYSA-N AUHZEENZYGFFBQ-UHFFFAOYSA-N
      RYYVLZVUVIJVGH-UHFFFAOYSA-N KWMALILVJYNFKE-UHFFFAOYSA-N
    ].each { |inchikey| stub_rest_request(inchikey) }
  end

  # Makes structure resolution fail for one specific SMILES, as an unparseable structure does.
  def unresolvable_structure(smiles)
    allow(importer).to receive(:extract_molfile_and_molecule).and_wrap_original do |original, row, index|
      next nil if importer.send(:row_value_case_insensitive, row, 'canonical smiles').to_s.strip == smiles

      original.call(row, index)
    end
  end

  # The fixture holds six SMILES-only rows.
  describe 'a row whose structure cannot be resolved' do
    it 'still imports every other row' do
      unresolvable_structure('c1ccccc1')
      expect { importer.process }.to change(Sample, :count).by(6)
    end

    it 'imports the row without a structure rather than dropping it' do
      unresolvable_structure('c1ccccc1')
      importer.process
      expect(Sample.where(decoupled: true).count).to eq(1)
    end

    it 'names the affected row in the result message' do
      unresolvable_structure('c1ccccc1')
      result = importer.process
      expect(result[:message]).to include('imported as decoupled because no structure could be resolved (row(s) 5)')
    end

    it 'does not report it as a clean success' do
      unresolvable_structure('c1ccccc1')
      expect(importer.process[:status]).to eq('warning')
    end
  end

  # smiles_to_molfile is the call that took the worker down in production. It can fail three ways, and
  # each has to land somewhere sensible.
  describe 'when Chemotion::OpenBabelService.smiles_to_molfile misbehaves' do
    context 'when it returns nil' do
      before { allow(Chemotion::OpenBabelService).to receive(:smiles_to_molfile).and_return(nil) }

      it 'imports every row without a structure rather than failing the file' do
        expect { importer.process }.to change(Sample, :count).by(6)
      end

      it 'marks them decoupled' do
        importer.process
        expect(Sample.where(decoupled: true).count).to eq(6)
      end

      it 'reports them' do
        expect(importer.process[:message]).to include('imported as decoupled because no structure could be')
      end
    end

    context 'when it returns a blank string' do
      before { allow(Chemotion::OpenBabelService).to receive(:smiles_to_molfile).and_return('   ') }

      it 'treats it as no structure and still imports the rows' do
        expect { importer.process }.to change(Sample, :count).by(6)
      end
    end

    context 'when it raises' do
      before do
        allow(Chemotion::OpenBabelService).to receive(:smiles_to_molfile)
          .and_raise(RuntimeError, 'open babel exploded')
      end

      it 'still imports the rows, falling back to decoupled instead of dropping them' do
        expect { importer.process }.to change(Sample, :count).by(6)
      end

      it 'does not report the rows as unprocessable' do
        expect(importer.process[:failed_rows]).to be_empty
      end

      it 'records the parse failure as the reason' do
        result = importer.process
        expect(result[:decoupled_fallbacks].pluck(:reason).uniq)
          .to eq(['structure could not be parsed: open babel exploded'])
      end

      it 'does not present the import as clean' do
        expect(importer.process[:status]).to eq('warning')
      end
    end

    context 'when a database error occurs while resolving the structure' do
      before do
        allow(Chemotion::OpenBabelService).to receive(:smiles_to_molfile)
          .and_raise(ActiveRecord::StatementInvalid, 'connection lost')
      end

      # A failed write must not be laundered into a structure-less sample.
      it 'reports the rows as unprocessable instead of importing them decoupled' do
        result = importer.process
        expect(result[:failed_rows]).to eq([2, 3, 4, 5, 6, 7])
        expect(Sample.count).to eq(0)
      end
    end

    context 'when the row also carries a CAS number' do
      let(:molecule) { create(:molecule) }

      before do
        allow(Chemotion::OpenBabelService).to receive(:smiles_to_molfile)
          .and_raise(RuntimeError, 'open babel exploded')
        allow(importer).to receive_messages(cas?: true, cas_value: '64-17-5')
        allow(importer).to receive(:find_molecule_by_cas).and_return(molecule)
      end

      it 'falls back to the CAS lookup rather than going straight to decoupled' do
        importer.process
        expect(Sample.where(decoupled: true).count).to eq(0)
      end

      it 'attaches the CAS-resolved molecule to every row' do
        importer.process
        expect(Sample.distinct.pluck(:molecule_id)).to eq([molecule.id])
      end
    end
  end

  describe 'row isolation against database errors' do
    # A genuine Postgres error, not a Ruby-raised one. Without a savepoint per row this aborts the
    # surrounding transaction, and every later row then fails with PG::InFailedSqlTransaction -- so
    # one bad row silently takes out the whole rest of the file.
    before do
      call_count = 0
      allow(importer).to receive(:sample_save).and_wrap_original do |original, *args, **kwargs|
        call_count += 1
        if call_count == 2
          # A real Postgres error, not a Ruby-raised one, so the transaction genuinely enters the
          # aborted state that a savepoint has to roll back.
          ActiveRecord::Base.connection.execute('SELECT 1 / 0')
        end

        original.call(*args, **kwargs)
      end
    end

    it 'imports the rows after the failing one' do
      importer.process
      expect(Sample.count).to eq(5)
    end

    it 'reports only the failing row as unprocessable' do
      result = importer.process
      expect(result[:unprocessed_data].pluck(:index)).to eq([1])
    end

    it 'returns a warning rather than an all-or-nothing failure' do
      result = importer.process
      expect(result[:status]).to eq('warning')
    end
  end

  describe 'batching' do
    it 'commits in batches of BATCH_SIZE instead of one transaction for the file' do
      stub_const('Import::ImportSamples::BATCH_SIZE', 2)
      # 6 rows / 2 = 3 batch transactions, each with one savepoint per row.
      allow(importer).to receive(:write_row).and_return(true)
      importer.process
      expect(importer).to have_received(:write_row).exactly(6).times
    end

    it 'imports the whole file when batched' do
      stub_const('Import::ImportSamples::BATCH_SIZE', 2)
      expect { importer.process }.to change(Sample, :count).by(6)
    end

    it 'keeps earlier batches when a later batch fails wholesale' do
      stub_const('Import::ImportSamples::BATCH_SIZE', 2)
      calls = 0
      allow(importer).to receive(:write_row).and_wrap_original do |original, *args|
        calls += 1
        raise ActiveRecord::StatementInvalid, 'batch blew up' if calls == 5

        original.call(*args)
      end
      result = importer.process
      # First two batches (4 rows) survive; the third is reported instead of discarding everything.
      expect(Sample.count).to eq(4)
      expect(result[:status]).to eq('warning')
    end
  end

  describe 'result completeness' do
    it 'states how many rows were imported out of how many were offered' do
      result = importer.process
      expect(result[:message]).to match(/6 of 6 row\(s\) in file: .* were imported into collection/)
    end

    it 'exposes the counts for programmatic use, not only in prose' do
      result = importer.process
      expect(result).to include(imported_count: 6, total_rows: 6, failed_rows: [], skipped_rows: [])
    end

    it 'accounts for rows skipped before import instead of dropping them silently' do
      allow(importer).to receive_messages(structure?: false, cas?: false, decoupled?: false)
      result = importer.process
      expect(result[:message]).to include('6 row(s) were skipped because they contained no structure')
      expect(result[:skipped_rows]).to eq([2, 3, 4, 5, 6, 7])
    end

    it 'does not report a clean success when rows were skipped' do
      allow(importer).to receive_messages(structure?: false, cas?: false, decoupled?: false)
      expect(importer.process[:status]).to eq('invalid')
    end

    it 'reports the imported and failed counts together when some rows fail' do
      allow(importer).to receive(:sample_save).and_wrap_original do |original, *args, **kwargs|
        raise ActiveRecord::RecordInvalid if args[3] == 2

        original.call(*args, **kwargs)
      end
      result = importer.process
      expect(result[:message]).to include('5 of 6 row(s)')
      expect(result[:message]).to include('The following row(s) could not be imported: 4.')
      expect(result[:failed_rows]).to eq([4])
    end

    it 'keeps the uploaded file when the import was not clean, so it can be fixed and retried' do
      unresolvable_structure('c1ccccc1')
      importer.process
      expect(Attachment.find_by(id: attachment.id)).to be_present
    end

    it 'removes the uploaded file only on a fully clean import' do
      importer.process
      expect(Attachment.find_by(id: attachment.id)).to be_nil
    end
  end

  describe 'decoupled column parsing' do
    # The standard import template writes "No", which is a truthy string in Ruby.
    it 'does not treat "No" as decoupled' do
      expect(importer.send(:decoupled?, { 'decoupled' => 'No' })).to be false
    end

    it 'does not treat "false" as decoupled' do
      expect(importer.send(:decoupled?, { 'decoupled' => 'false' })).to be false
    end

    it 'treats "Yes" as decoupled' do
      expect(importer.send(:decoupled?, { 'decoupled' => 'Yes' })).to be true
    end

    it 'treats a missing column as not decoupled' do
      expect(importer.send(:decoupled?, {})).to be false
    end

    it 'reads the column case-insensitively' do
      expect(importer.send(:decoupled?, { 'Decoupled' => 'true' })).to be true
    end
  end

  describe 'result payload size' do
    it 'does not retain full Sample records for every imported row' do
      result = importer.process
      expect(result[:data]).to all(match(hash_including(:id, :short_label, :decoupled)))
      expect(result[:data].map(&:keys).flatten.uniq).to contain_exactly(:id, :short_label, :decoupled)
    end
  end

  describe 'CAS column handling' do
    let(:importer_for_cas) { importer }

    it 'reads the CAS column case-insensitively' do
      expect(importer_for_cas.send(:cas_value, { 'CAS' => ' 64-17-5 ' })).to eq('64-17-5')
    end

    it 'accepts mixed-case and padded header names' do
      expect(importer_for_cas.send(:cas?, { ' Cas ' => '64-17-5' })).to be true
    end

    it 'treats a blank CAS cell as absent' do
      expect(importer_for_cas.send(:cas?, { 'cas' => '   ' })).to be false
    end

    it 'resolves CAS numbers without holding an import transaction open' do
      allow(importer).to receive_messages(
        cas?: true, structure?: false, cas_value: '64-17-5', mandatory_check: { 'cas' => true },
      )

      # RSpec wraps each example in its own transaction, so transaction_open? is always true here.
      # What matters is the nesting depth at the moment the external HTTP lookup happens: holding a
      # transaction open across a 10s CAS timeout plus a PubChem fallback is the thing to avoid.
      baseline = ActiveRecord::Base.connection.open_transactions
      depths = []
      allow(Chemotion::CasLookupService).to receive(:fetch_by_cas) do
        depths << ActiveRecord::Base.connection.open_transactions
        { smiles: nil }
      end

      importer.process
      expect(depths).not_to be_empty
      expect(depths).to all(eq(baseline))
    end
  end

  describe 'decoupled fallback reporting' do
    it 'names the rows that lost their structure' do
      allow(importer).to receive(:extract_molfile_and_molecule).and_return(nil)
      result = importer.process
      expect(result[:message]).to include('imported as decoupled because no structure could be resolved')
    end

    it 'exposes the fallback rows structurally, not only in prose' do
      allow(importer).to receive(:extract_molfile_and_molecule).and_return(nil)
      result = importer.process
      expect(result[:decoupled_fallbacks].pluck(:index)).to eq([0, 1, 2, 3, 4, 5])
    end

    it 'gives a reason per fallback row' do
      allow(importer).to receive(:extract_molfile_and_molecule).and_return(nil)
      result = importer.process
      expect(result[:decoupled_fallbacks].pluck(:reason).uniq)
        .to eq(['structure could not be interpreted'])
    end
  end
end
