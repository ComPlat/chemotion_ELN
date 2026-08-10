# frozen_string_literal: true

require 'rails_helper'
require 'caxlsx'
require 'roo'

# Covers what the user is told after an import: that a bad cell costs the cell and not the row, that
# the row numbers named are the row numbers in their file, and that the report reaches their Inbox.
RSpec.describe Import::ImportSamples do
  let(:user) { create(:user) }
  let(:collection) { create(:collection, user_id: user.id) }
  let(:header) do
    ['sample name', 'canonical smiles', 'decoupled', 'melting pt', 'density', 'purity', 'real amount',
     'real unit']
  end

  # Row 4 has nothing to import, so every row after it lands at a different index than sheet row --
  # which is the whole reason the reported numbers used to be wrong.
  let(:rows) do
    [
      ['Clean', 'CCO', nil, '65', '0.789', '0.99', '10', 'g'],
      ['Bad values', 'CCN', nil, 'n/a', 'not measured', 'pure-ish', nil, 'furlongs'],
      [nil, nil, nil, nil, nil, nil, nil, nil],
      ['Percent purity', 'CCC', nil, nil, nil, '95', nil, nil],
      ['Reversed range', 'CCCC', nil, '120-80', nil, nil, nil, nil],
    ]
  end

  let(:path) { Rails.root.join("tmp/import_report_e2e_#{SecureRandom.hex(4)}.xlsx") }

  let(:attachment) do
    create(:attachment,
           filename: 'customer_list.xlsx',
           file_path: path,
           created_by: user.id,
           created_for: user.id,
           content_type: Import::ImportSamples::XLSX_CONTENT_TYPE)
  end

  let(:importer) { described_class.new(attachment, collection.id, user.id, attachment.filename, 'sample') }
  let(:result) { importer.process }

  before do
    package = Axlsx::Package.new
    package.workbook.add_worksheet(name: 'sample') do |sheet|
      sheet.add_row header
      rows.each { |row| sheet.add_row row, types: Array.new(header.size, :string) }
    end
    package.serialize(path.to_s)

    stub_request(:get, /pubchem\.ncbi\.nlm\.nih\.gov/).to_return(status: 200, body: '', headers: {})
  end

  after { FileUtils.rm_f(path) }

  def report_sheet(attachment_id)
    report = Attachment.find(attachment_id)
    copy = Rails.root.join("tmp/report_read_#{SecureRandom.hex(4)}.xlsx")
    File.binwrite(copy, report.attachment.read)
    book = Roo::Spreadsheet.open(copy.to_s, extension: :xlsx)
    book.default_sheet = Import::ImportReportWorkbook::SHEET_NAME
    yield book
  ensure
    FileUtils.rm_f(copy) if copy
  end

  describe 'a row with values the database would reject' do
    it 'imports every row that has a structure' do
      expect { result }.to change(Sample, :count).by(4)
    end

    it 'keeps the values it could read' do
      result
      expect(Sample.find_by(name: 'Clean').density).to eq(0.789)
    end

    it 'leaves the column default rather than storing zero for an unreadable purity' do
      result
      expect(Sample.find_by(name: 'Bad values').purity).to eq(1.0)
    end

    it 'reads a purity given as a percentage as a fraction instead of failing the row' do
      result
      expect(Sample.find_by(name: 'Percent purity').purity).to eq(0.95)
    end

    it 'normalises a reversed range instead of losing the row to it' do
      result
      expect(Sample.find_by(name: 'Reversed range').melting_point.to_s).to eq('80.0..120.0')
    end
  end

  describe 'the row numbers it reports' do
    # 'Reversed range' is the fifth data row but the fourth queued one, because row 4 was skipped.
    it 'names the sheet row, not the position in the queue' do
      result
      report_sheet(result[:report_attachment_id]) do |book|
        expect(book.row(6).first).to eq('Reversed range')
      end
    end

    it 'marks the blank row as skipped' do
      result
      report_sheet(result[:report_attachment_id]) do |book|
        expect(book.row(4).last(3).first).to eq(Import::ImportReportWorkbook::STATUS_SKIPPED)
      end
    end
  end

  describe 'the report it leaves behind' do
    it 'reports which values it could not use' do
      result
      report_sheet(result[:report_attachment_id]) do |book|
        expect(book.row(3)[-2]).to include('density', 'purity', 'melting pt', 'real unit')
      end
    end

    # Roo returns a linked cell as a Roo::Link, which is a String subclass -- Excel still holds the id
    # as a number, so the comparison is made on the value rather than the wrapper.
    it 'gives the id of the sample each row created' do
      result
      report_sheet(result[:report_attachment_id]) do |book|
        expect(book.row(2).last.to_i).to eq(Sample.find_by(name: 'Clean').id)
      end
    end

    it 'puts the report in the user Inbox as an unlinked attachment' do
      result
      report = Attachment.find(result[:report_attachment_id])
      expect(
        Attachment.where(attachable_type: 'Container', attachable_id: nil, created_for: user.id),
      ).to include(report)
    end

    it 'tells the user where to find it' do
      expect(result[:message]).to include('is in your Inbox')
    end

    it 'names the report so the notification can link to it' do
      expect(result[:report_filename]).to eq('customer_list_import_report.xlsx')
    end
  end

  # An inventory list that names substances without drawing them is a real file. Refusing those rows
  # loses the user's data; the one row worth refusing is the one that contradicts itself.
  describe 'a row with nothing to resolve a structure from' do
    let(:rows) do
      [
        ['Has a structure', 'CCO', nil, nil, nil, nil, nil, nil],
        ['Blank decoupled flag', nil, nil, nil, nil, nil, nil, nil],
        ['Says yes', nil, 'Yes', nil, nil, nil, nil, nil],
        ['Says no', nil, 'No', nil, nil, nil, nil, nil],
      ]
    end

    it 'imports the row whose decoupled column was left blank' do
      result
      expect(Sample.find_by(name: 'Blank decoupled flag')).to be_present
    end

    it 'imports it without a structure' do
      result
      expect(Sample.find_by(name: 'Blank decoupled flag').decoupled).to be(true)
    end

    it 'still imports a row that asked for decoupling outright' do
      result
      expect(Sample.find_by(name: 'Says yes')).to be_present
    end

    it 'refuses the row that says it is not decoupled while giving no structure' do
      result
      expect(Sample.find_by(name: 'Says no')).to be_nil
    end

    it 'names that row as skipped and says what to change' do
      report_sheet(result[:report_attachment_id]) do |book|
        expect(book.row(5)[-2]).to include("'decoupled' is set to no", 'set decoupled to yes')
      end
    end

    # A blank flag is a guess on our part, so it is reported; an explicit "Yes" is not.
    it 'reports the row it decoupled by inference' do
      expect(result[:message]).to include('imported without a structure', 'row 3')
    end

    it 'does not report the row that asked for decoupling' do
      expect(result[:message]).not_to include('rows 3, 4')
    end
  end

  describe 'an entirely empty row' do
    let(:rows) { [['Real', 'CCO', nil, nil, nil, nil, nil, nil], [nil, nil, nil, nil, nil, nil, nil, nil]] }

    it 'creates no sample for it' do
      expect { result }.to change(Sample, :count).by(1)
    end
  end

  # The report holds the same values plus the verdict, so the uploaded file no longer has a reason to
  # stay in the Inbox next to it.
  describe 'the uploaded file' do
    it 'is replaced by the report' do
      result
      expect(Attachment.exists?(attachment.id)).to be(false)
    end

    it 'leaves exactly one file in the Inbox' do
      result
      expect(
        Attachment.where(attachable_type: 'Container', attachable_id: nil, created_for: user.id).count,
      ).to eq(1)
    end

    context 'when the report cannot be built' do
      before { allow(Import::ImportReportWorkbook).to receive(:new).and_raise(StandardError, 'no disk') }

      # Otherwise a failed report leaves the user with no copy of their file at all.
      it 'is kept' do
        result
        expect(Attachment.exists?(attachment.id)).to be(true)
      end
    end
  end

  describe 'an import with nothing to report' do
    let(:rows) { [['Clean', 'CCO', nil, '65', '0.789', '0.99', '10', 'g']] }

    it 'reports a clean success' do
      expect(result[:status]).to eq('ok')
    end

    # Every import now leaves the same single artefact behind, whether or not anything went wrong.
    it 'still leaves a report in the Inbox' do
      result
      expect(Attachment.find(result[:report_attachment_id]).filename)
        .to eq('customer_list_import_report.xlsx')
    end

    it 'still replaces the uploaded file' do
      result
      expect(Attachment.exists?(attachment.id)).to be(false)
    end
  end

  describe 'the sample id column' do
    # Roo exposes a hyperlinked cell as a Roo::Link, so the href can be read back directly.
    def sample_id_cells(attachment_id)
      report_sheet(attachment_id) do |book|
        column = book.row(1).index('sample id')
        (2..book.last_row).map { |number| book.row(number)[column] }
      end
    end

    it 'links every imported row to its sample on this instance' do
      result
      sample = Sample.find_by(name: 'Clean')
      hrefs = sample_id_cells(result[:report_attachment_id]).filter_map do |cell|
        cell.href if cell.respond_to?(:href)
      end
      expect(hrefs)
        .to include("#{Rails.application.config.root_url}/mydb/collection/#{collection.id}/sample/#{sample.id}")
    end

    it 'adds no link for a row that created no sample' do
      result
      # 4 of the 5 data rows import; the blank row gets no id and so nothing to link to.
      linked = sample_id_cells(result[:report_attachment_id]).count { |cell| cell.respond_to?(:href) }
      expect(linked).to eq(4)
    end
  end

  describe 'a row that cannot be saved at all' do
    before do
      allow(importer).to receive(:validate_sample_and_save).and_wrap_original do |original, *args|
        if args[2]['sample name'] == 'Clean'
          raise ActiveRecord::StatementInvalid, 'PG::DataException: ERROR:  value out of range'
        end

        original.call(*args)
      end
    end

    it 'still imports the other rows' do
      expect { result }.to change(Sample, :count).by(3)
    end

    it 'marks the row as not imported' do
      result
      report_sheet(result[:report_attachment_id]) do |book|
        expect(book.row(2).last(3).first).to eq(Import::ImportReportWorkbook::STATUS_FAILED)
      end
    end

    it 'reports the reason without the Postgres preamble' do
      result
      report_sheet(result[:report_attachment_id]) do |book|
        expect(book.row(2)[-2]).to eq('value out of range')
      end
    end
  end

  describe 'when the report cannot be built' do
    before { allow(Import::ImportReportWorkbook).to receive(:new).and_raise(StandardError, 'no disk') }

    it 'does not turn a completed import into a failure' do
      expect { result }.to change(Sample, :count).by(4)
    end

    it 'reports no attachment rather than a broken one' do
      expect(result[:report_attachment_id]).to be_nil
    end
  end
end
