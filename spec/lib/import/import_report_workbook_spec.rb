# frozen_string_literal: true

require 'rails_helper'
require 'roo'
require 'zip'

# The colours are the whole point of this workbook, so they are read back out of the file rather than
# assumed: a style that silently failed to apply would leave a report that looks complete and marks
# nothing.
RSpec.describe Import::ImportReportWorkbook do
  subject(:workbook) do
    described_class.new(
      file_name: 'customer_list.xlsx',
      header: ['sample name', 'solvent', 'melting pt', 'canonical smiles', 'import notes'],
      rows: {
        2 => ['Fine', nil, 65.0, 'CCO', 'a note from a previous report'],
        3 => ['Amber', nil, '007', 'CCN', nil],
        4 => ['Broken', nil, '12', 'nonsense', nil],
        5 => [nil, nil, nil, nil, nil],
      },
      statuses: {
        2 => { status: described_class::STATUS_IMPORTED, sample_id: 11 },
        3 => { status: described_class::STATUS_IMPORTED_WITH_NOTES, sample_id: 12 },
        4 => { status: described_class::STATUS_FAILED, reason: 'structure could not be stored' },
        5 => { status: described_class::STATUS_SKIPPED, reason: 'empty row' },
      },
      field_notes: {
        3 => [
          { header: 'melting pt', value: '007', note: 'could not be read as a number' },
          { header: 'canonical smiles', value: 'CCN', note: 'structure could not be interpreted' },
        ],
      },
    )
  end

  let(:path) { Rails.root.join("tmp/import_report_spec_#{SecureRandom.hex(4)}.xlsx") }

  before { workbook.write(path, sample_url: ->(id) { "https://eln.example.org/sample/#{id}" }) }

  after { FileUtils.rm_f(path) }

  # Style index per cell, resolved to the fill colour it points at.
  def fills
    Zip::File.open(path) { |zip| row_fills(zip, cell_fills(zip)) }
  end

  def cell_fills(zip)
    styles = Nokogiri::XML(zip.read('xl/styles.xml'))
    palette = styles.css('fills patternFill').map { |fill| fill.at_css('fgColor')&.[]('rgb') }
    styles.css('cellXfs xf').map { |xf| palette[xf['fillId'].to_i] }
  end

  def row_fills(zip, cell_fills)
    Nokogiri::XML(zip.read('xl/worksheets/sheet1.xml')).css('sheetData row').to_h do |row|
      [row['r'].to_i, row.css('c').map { |cell| cell_fills[cell['s'].to_i] }]
    end
  end

  # Column letters whose style sets wrapText, per row. Keyed by the cell reference rather than by
  # position, because a blank cell is not necessarily written out.
  def wrapped_cells
    Zip::File.open(path) do |zip|
      styles = Nokogiri::XML(zip.read('xl/styles.xml'))
      wrapping = styles.css('cellXfs xf').map { |xf| xf.at_css('alignment')&.[]('wrapText') == '1' }
      Nokogiri::XML(zip.read('xl/worksheets/sheet1.xml')).css('sheetData row').to_h do |row|
        wrapped = row.css('c').select { |cell| wrapping[cell['s'].to_i] }
        [row['r'].to_i, wrapped.map { |cell| cell['r'].sub(/\d+\z/, '') }]
      end
    end
  end

  def column_letter(header_name)
    ('A'.ord + sheet.row(1).index(header_name)).chr
  end

  def sheet
    book = Roo::Spreadsheet.open(path.to_s, extension: :xlsx)
    book.default_sheet = described_class::SHEET_NAME
    book
  end

  it 'appends the status, notes and sample id columns' do
    expect(sheet.row(1).last(3)).to eq(described_class::EXTRA_HEADERS)
  end

  it 'keeps the values as they were read' do
    expect(sheet.row(2).first(3)).to eq(['Fine', 65.0, 'CCO'])
  end

  # A shipped template carries dozens of columns a given lab never fills in, and reproducing them all
  # pushes the status and notes columns off the screen.
  it 'leaves out a column that is empty in every row' do
    expect(sheet.row(1)).not_to include('solvent')
  end

  it 'keeps a column that is filled in at least one row' do
    expect(sheet.row(1)).to include('melting pt')
  end

  # A report is a plausible input to the next import, so its own columns must not accumulate.
  it 'appends its own columns exactly once when given a file that already has them' do
    expect(sheet.row(1).count('import notes')).to eq(1)
  end

  # Otherwise caxlsx infers a number from the string and a lot number of "007" is reported back as 7.
  it 'does not turn a text cell that looks numeric into a number' do
    expect(sheet.row(3)[1]).to eq('007')
  end

  # Roo returns a linked cell as a Roo::Link, a String subclass; Excel still stores the id as a number.
  it 'gives back the id of the sample a row created' do
    expect(sheet.row(2).last.to_i).to eq(11)
  end

  it 'links the sample id to the url the caller supplies' do
    expect(sheet.row(2).last.href).to eq('https://eln.example.org/sample/11')
  end

  it 'leaves the id unlinked when the row created no sample' do
    expect(sheet.row(4).last).to be_nil
  end

  # The host belongs to the instance the import ran on, so the workbook never builds one itself.
  it 'renders without links when no url builder is given' do
    plain = Rails.root.join("tmp/import_report_nolink_#{SecureRandom.hex(4)}.xlsx")
    workbook.write(plain)
    book = Roo::Spreadsheet.open(plain.to_s, extension: :xlsx)
    book.default_sheet = described_class::SHEET_NAME
    expect(book.row(2).last).to eq(11)
  ensure
    FileUtils.rm_f(plain) if plain
  end

  it 'says why a row was not imported' do
    expect(sheet.row(4)[-2]).to include('structure could not be stored')
  end

  it 'names the column a dropped value came from' do
    expect(sheet.row(3)[-2]).to include('melting pt', 'could not be read as a number')
  end

  it 'puts each note on its own line' do
    expect(sheet.row(3)[-2].split("\n")).to contain_exactly(
      a_string_including('melting pt'), a_string_including('canonical smiles')
    )
  end

  # Excel renders an unwrapped newline as a single run, so without this the notes arrive squashed
  # onto one line however many of them there are.
  it 'wraps the notes cell so the line breaks are visible' do
    expect(wrapped_cells[3]).to eq([column_letter('import notes')])
  end

  it 'fills a row that was not imported' do
    expect(fills[4].uniq).to eq([described_class::RED].map { |rgb| "FF#{rgb}" })
  end

  it 'fills a row that was skipped' do
    expect(fills[5].uniq).to eq([described_class::GREY].map { |rgb| "FF#{rgb}" })
  end

  # Column 1 once the empty 'solvent' column is dropped -- the note is filed under a header name, so
  # this also proves the fill follows the column to its new position.
  it 'fills only the offending cells of a row that did import' do
    expect(fills[3].each_index.select { |i| fills[3][i] == "FF#{described_class::AMBER}" }).to eq([1, 2])
  end

  it 'leaves a row that imported cleanly unfilled, so the marked rows stand out' do
    expect(fills[2].compact.uniq).to be_empty
  end

  it 'explains the markings on a legend sheet' do
    book = Roo::Spreadsheet.open(path.to_s, extension: :xlsx)
    expect(book.sheets).to include(described_class::LEGEND_NAME)
  end
end
