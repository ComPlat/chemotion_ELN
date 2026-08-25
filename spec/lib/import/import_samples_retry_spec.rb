# frozen_string_literal: true

require 'rails_helper'
require 'caxlsx'
require 'roo'

# The report is meant to be corrected and imported again. That makes it an input as well as an output,
# so these cover the round trip: what the retry sheet contains, and what importing it does.
RSpec.describe Import::ImportSamples do
  let(:user) { create(:user) }
  let(:source) { write_sheet('retry_src', header, rows) }
  let(:result) { import(source) }
  let(:collection) { create(:collection, user_id: user.id) }
  let(:header) { ['sample name', 'canonical smiles', 'decoupled', 'melting pt', 'density', 'purity'] }
  let(:rows) do
    [
      ['Clean', 'CCO', nil, '65', '0.789', '0.99'],
      ['Bad values', 'CCN', nil, 'n/a', 'not measured', nil],
      [nil, nil, nil, nil, nil, nil],
      ['Refused', nil, 'No', nil, nil, nil],
    ]
  end

  # Everything lands under tmp/ and is remembered, so a run leaves nothing behind in the working tree.
  def write_sheet(basename, sheet_header, sheet_rows, name: 'sample')
    path = Rails.root.join("tmp/#{basename}_#{SecureRandom.hex(4)}.xlsx")
    package = Axlsx::Package.new
    package.workbook.add_worksheet(name: name) do |sheet|
      sheet.add_row sheet_header
      sheet_rows.each { |row| sheet.add_row row, types: Array.new(sheet_header.size, :string) }
    end
    package.serialize(path.to_s)
    written << path
    path
  end

  def written
    @written ||= []
  end

  def import(path, as_user: user, into: collection, import_type: 'sample')
    attachment = create(:attachment, filename: File.basename(path), file_path: path,
                                     created_by: as_user.id, created_for: as_user.id,
                                     content_type: described_class::XLSX_CONTENT_TYPE)
    described_class.new(attachment, into.id, as_user.id, attachment.filename, import_type).process
  end

  def report_book(result, sheet_name)
    path = Rails.root.join("tmp/retry_spec_#{SecureRandom.hex(4)}.xlsx")
    File.binwrite(path, Attachment.find(result[:report_attachment_id]).attachment.read)
    book = Roo::Spreadsheet.open(path.to_s, extension: :xlsx)
    book.default_sheet = sheet_name
    yield book
  ensure
    FileUtils.rm_f(path) if path
  end

  before { stub_request(:get, /pubchem\.ncbi\.nlm\.nih\.gov/).to_return(status: 200, body: '', headers: {}) }

  after { written.each { |path| FileUtils.rm_f(path) } }

  describe 'the retry sheet' do
    # Named for what set_main_sheet looks for, so importing the report again reads this sheet and the
    # user never has to delete the rows that already worked.
    it 'is the sheet the importer would read back' do
      report_book(result, 'sample') { |book| expect(book.sheets).to include('sample') }
    end

    it 'is named for a chemical inventory when that is what was imported' do
      chemical = import(write_sheet('retry_chem',
                                    header, rows, name: 'sample_chemicals'),
                        import_type: 'chemical')
      report_book(chemical, 'sample_chemicals') do |book|
        expect(book.sheets).to include('sample_chemicals')
      end
    end

    it 'leads with a sample id column, which is what turns a row into an update' do
      report_book(result, 'sample') { |book| expect(book.row(1).first).to eq('sample id') }
    end

    it 'keeps the headers some row on it actually uses' do
      report_book(result, 'sample') { |book| expect(book.row(1)).to include('density', 'melting pt') }
    end

    # Same rule as the report sheet: a correction sheet thirty columns wide hides the cells to correct.
    it 'leaves out a header no row on it uses' do
      report_book(result, 'sample') { |book| expect(book.row(1)).not_to include('purity') }
    end

    # Pruning is only safe because this column always stays: check_required_fields accepts it on its
    # own, so the sheet can never lose the header that lets it be imported again.
    it 'keeps the sample id column even when no row on it has one' do
      only_failures = import(write_sheet('retry_fail', ['sample name', 'decoupled'], [%w[Refused No]]))
      report_book(only_failures, 'sample') { |book| expect(book.row(1).first).to eq('sample id') }
    end

    it 'omits rows that imported with nothing to fix' do
      report_book(result, 'sample') do |book|
        names = (2..book.last_row).map { |n| book.row(n)[book.row(1).index('sample name')] }
        expect(names).not_to include('Clean')
      end
    end

    it 'omits blank rows, which have nothing to correct' do
      report_book(result, 'sample') { |book| expect(book.last_row).to eq(3) }
    end

    it 'carries a row that did not import with its values and no sample id' do
      report_book(result, 'sample') do |book|
        row = (2..book.last_row).map { |n| book.row(n) }
                                .find { |r| r[book.row(1).index('sample name')] == 'Refused' }
        expect(row.first).to be_nil
      end
    end

    it 'carries a row whose values were dropped with the id of the sample it created' do
      report_book(result, 'sample') do |book|
        row = (2..book.last_row).map { |n| book.row(n) }.find { |r| r.first.present? }
        expect(row.first.to_i).to eq(Sample.find_by(name: 'Bad values').id)
      end
    end

    # Only the cells that need attention, because on the way back an empty cell means "leave this be".
    it 'blanks the fields of an update row that were fine' do
      report_book(result, 'sample') do |book|
        row = (2..book.last_row).map { |n| book.row(n) }.find { |r| r.first.present? }
        expect(row[book.row(1).index('sample name')]).to be_nil
      end
    end

    it 'keeps the fields of an update row that were not' do
      report_book(result, 'sample') do |book|
        row = (2..book.last_row).map { |n| book.row(n) }.find { |r| r.first.present? }
        expect(row[book.row(1).index('density')].to_s).to eq('not measured')
      end
    end
  end

  describe 'importing a sheet that names existing samples' do
    let(:sample) { Sample.find_by(name: 'Bad values') }
    let(:update_header) { ['sample id', 'sample name', 'canonical smiles', 'density'] }
    let(:corrected) do
      write_sheet('retry_fix', update_header,
                  [[sample.id.to_s, nil, nil, '0.85']])
    end

    before { result }

    it 'creates no new sample' do
      expect { import(corrected) }.not_to change(Sample, :count)
    end

    it 'applies the corrected value to the existing sample' do
      import(corrected)
      expect(sample.reload.density).to eq(0.85)
    end

    # This is what lets the retry sheet ship a row with two cells filled in and the rest empty.
    it 'leaves a field whose cell was left empty alone' do
      import(corrected)
      expect(sample.reload.name).to eq('Bad values')
    end

    it 'reports it as an update rather than an import' do
      expect(import(corrected)[:message]).to include('updated 1 of 1 row')
    end

    it 'names the updated rows' do
      expect(import(corrected)[:message]).to include('1 existing sample updated from row 2')
    end

    it 'marks the row as updated in the report' do
      updated = import(corrected)
      report_book(updated, 'import report') do |book|
        status = book.row(2)[book.row(1).index('import status')]
        expect(status).to eq(Import::ImportReportWorkbook::STATUS_UPDATED)
      end
    end
  end

  # The point of flagging the structure cell is that correcting it works. A row that names a decoupled
  # sample and carries a readable structure has to re-couple it, or the round trip reports an update
  # and leaves the sample exactly as broken as it was.
  describe 'importing a corrected structure for a decoupled sample' do
    let(:rows) { [['Lost structure', 'not a structure', nil, nil, nil, nil]] }
    let(:sample) { Sample.find_by(name: 'Lost structure') }
    let(:corrected) do
      write_sheet('retry_structure', ['sample id', 'canonical smiles'], [[sample.id.to_s, 'CCO']])
    end

    before { result }

    it 'imported the row without a structure to begin with' do
      expect(sample.decoupled).to be(true)
    end

    it 'couples the sample to the corrected structure' do
      import(corrected)
      expect(sample.reload.decoupled).to be(false)
    end

    it 'gives it the molecule the corrected cell resolves to' do
      import(corrected)
      expect(sample.reload.molecule.cano_smiles).to eq('CCO')
    end

    it 'stores the molfile that structure produced' do
      import(corrected)
      expect(sample.reload.molfile).to be_present
    end

    context 'when the correction is still unreadable' do
      let(:corrected) do
        write_sheet('retry_structure_bad', ['sample id', 'canonical smiles'],
                    [[sample.id.to_s, 'still not a structure']])
      end

      it 'leaves the sample decoupled' do
        import(corrected)
        expect(sample.reload.decoupled).to be(true)
      end

      # Otherwise the row reports as a clean update and the user has no reason to look at it again.
      it 'does not report the update as clean' do
        expect(import(corrected)[:status]).to eq('warning')
      end
    end
  end

  # A failed update has to stay an update on the way back, or correcting it creates a second sample.
  describe 'the retry sheet for an update row that failed' do
    let(:sample) do
      import(write_sheet('retry_target', ['sample name', 'canonical smiles'], [%w[Target CCO]]))
      collection.samples.order(:id).last
    end
    let(:failed_update) do
      import(write_sheet('retry_bad_update',
                         ['sample id', 'sample name', 'density'],
                         [[sample.id.to_s, 'Renamed', 'not measured'],
                          ['999999999', 'Missing', '0.85']]))
    end

    it 'keeps the sample id of a row that could not be updated' do
      report_book(failed_update, 'sample') do |book|
        row = (2..book.last_row).map { |n| book.row(n) }
                                .find { |r| r[book.row(1).index('sample name')] == 'Missing' }
        expect(row.first.to_s).to eq('999999999')
      end
    end

    it 'keeps the sample id of a row that updated but lost a value' do
      report_book(failed_update, 'sample') do |book|
        row = (2..book.last_row).map { |n| book.row(n) }
                                .find { |r| r.first.to_s == sample.id.to_s }
        expect(row).to be_present
      end
    end
  end

  describe 'a sample id the importer must not accept' do
    let(:other_user) { create(:user) }
    let(:other_collection) { create(:collection, user_id: other_user.id) }
    let(:victim) do
      import(write_sheet('retry_victim',
                         ['sample name', 'canonical smiles'], [%w[Victim CCO]]),
             as_user: other_user, into: other_collection)
      other_collection.samples.order(:id).last
    end

    def attempt(id)
      path = write_sheet('retry_attack',
                         ['sample id', 'sample name'], [[id, 'HIJACKED']])
      import(path)
    end

    it 'refuses a sample belonging to somebody else' do
      attempt(victim.id.to_s)
      expect(victim.reload.name).to eq('Victim')
    end

    it 'reports that row as not imported' do
      expect(attempt(victim.id.to_s)[:failed_rows]).to eq([2])
    end

    # Same wording for "not yours" and "does not exist": telling them apart would confirm the existence
    # of other people's samples to anyone willing to put ids in a spreadsheet.
    it 'does not reveal whether the sample exists' do
      mine = attempt(victim.id.to_s)[:unprocessed_data].first[:reason]
      absent = attempt('999999999')[:unprocessed_data].first[:reason]
      expect(mine.sub(victim.id.to_s, 'ID')).to eq(absent.sub('999999999', 'ID'))
    end

    it 'refuses a sample id that is not a number' do
      expect(attempt('not-a-number')[:failed_rows]).to eq([2])
    end
  end
end
