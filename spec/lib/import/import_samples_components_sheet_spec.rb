# frozen_string_literal: true

require 'rails_helper'
require 'caxlsx'

# One selected sheet per spreadsheet, shared by both readers: whichever was selected last decides how
# every later row is classified.
RSpec.describe Import::ImportSamples do
  let(:user) { create(:user) }
  let(:collection) { create(:collection, user_id: user.id) }
  let(:path) { Rails.root.join("tmp/components_sheet_#{SecureRandom.hex(4)}.xlsx") }
  # Generated, not a fixture: the point below is that a *valid* molfile is classified as a structure.
  let(:ethanol_molfile) { Chemotion::OpenBabelService.smiles_to_molfile('CCO') }

  # Different structure columns per sheet: what makes a leaked sheet selection visible at all.
  let(:header) { ['sample name', 'molfile', 'sample uuid'] }
  let(:rows) do
    [
      ['With components', ethanol_molfile, 'uuid-1'],
      ['After components', ethanol_molfile, nil],
    ]
  end

  let(:attachment) do
    create(:attachment, filename: 'components.xlsx', file_path: path,
                        created_by: user.id, created_for: user.id,
                        content_type: described_class::XLSX_CONTENT_TYPE)
  end
  let(:importer) { described_class.new(attachment, collection.id, user.id, attachment.filename, 'sample') }

  before do
    package = Axlsx::Package.new
    package.workbook.add_worksheet(name: 'sample') do |sheet|
      sheet.add_row header
      rows.each { |row| sheet.add_row row, types: Array.new(header.size, :string) }
    end
    package.workbook.add_worksheet(name: 'sample_components') do |sheet|
      sheet.add_row ['sample uuid', 'canonical smiles', 'ratio']
      sheet.add_row %w[uuid-1 CCO 1], types: %i[string string string]
    end
    package.serialize(path.to_s)

    stub_request(:get, /pubchem\.ncbi\.nlm\.nih\.gov/).to_return(status: 200, body: '', headers: {})
  end

  after { FileUtils.rm_f(path) }

  it 'imports the row that follows a row with components with its own structure' do
    importer.process
    expect(Sample.find_by(name: 'After components')&.decoupled).to be(false)
  end
end
