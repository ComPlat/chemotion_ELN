# frozen_string_literal: true

require 'rails_helper'
require 'csv'
require 'roo'

# End-to-end import of the files we actually ship in public/xlsx and public/sdf, through
# ImportSamplesJob -- the single entry point the API uses for every import.
#
# Covers both modes the UI offers:
#   * normal import      -- the uploaded file goes to the job as-is
#   * column mapping     -- SampleAPI turns the validated grid into a CSV tempfile and imports that,
#                           so the mapped path is exercised by importing a CSV built from the sheet
#
# Note the distinction between the two kinds of shipped file: `*_template.*` are blank forms with
# headers/property tags and no structures, so importing one is expected to create nothing. Only
# `*_example.*` carry real molfiles.
# rubocop:disable RSpec/DescribeClass -- spans ImportSamplesJob, ImportSamples and ImportSdf
RSpec.describe 'Import of the shipped template files' do
  let(:user) { create(:user) }
  let(:collection) { create(:collection) }

  before do
    # Nothing here may reach the network: structure lookups (PubChem), CAS resolution, and the safety
    # datasheet fetch the chemical import performs per row.
    stub_request(:get, /pubchem\.ncbi\.nlm\.nih\.gov/).to_return(status: 200, body: '', headers: {})
    stub_request(:get, /commonchemistry\.cas\.org/).to_return(status: 404, body: '', headers: {})
    stub_request(:get, /sigmaaldrich\.com/).to_return(status: 404, body: '', headers: {})
    stub_request(:get, /thermofisher\.com/).to_return(status: 404, body: '', headers: {})
  end

  def attachment_for(relative_path, filename)
    path = Rails.root.join(relative_path)
    create(
      :attachment,
      filename: filename,
      file_path: path,
      file_data: path.read,
      created_by: user.id,
      created_for: user.id,
    )
  end

  def run_import(relative_path, filename, import_type)
    ActiveJob::Status.store.clear
    ImportSamplesJob.new.perform(
      collection_id: collection.id,
      user_id: user.id,
      attachment: attachment_for(relative_path, filename),
      import_type: import_type,
    )
  end

  # Mirrors SampleAPI's column-mapping branch: the validated grid is written out as a CSV and
  # imported as a .csv file rather than the original workbook.
  def csv_from_sheet(relative_path)
    xlsx = Roo::Spreadsheet.open(Rails.root.join(relative_path).to_s, extension: :xlsx)
    sheet_name = xlsx.sheets.include?('sample') ? 'sample' : xlsx.sheets.first
    sheet = xlsx.sheet(sheet_name)
    header = sheet.row(1)

    file = Tempfile.new(['mapped_import', '.csv'])
    CSV.open(file.path, 'w') do |csv|
      csv << header
      (2..sheet.last_row).each { |i| csv << sheet.row(i) }
    end
    file
  end

  describe 'normal import' do
    context 'with the samples example workbook' do
      it 'creates samples' do
        expect { run_import('public/xlsx/sample_import_example.xlsx', 'sample_import_example.xlsx', 'sample') }
          .to change(Sample, :count).by_at_least(1)
      end

      it 'does not report an error status' do
        result = run_import('public/xlsx/sample_import_example.xlsx', 'sample_import_example.xlsx', 'sample')
        expect(result[:status]).not_to eq('invalid')
      end
    end

    context 'with the chemicals example workbook' do
      it 'creates samples' do
        expect { run_import('public/xlsx/chemical_import_example.xlsx', 'chemical_import_example.xlsx', 'chemical') }
          .to change(Sample, :count).by_at_least(1)
      end

      it 'creates the linked chemical records' do
        expect { run_import('public/xlsx/chemical_import_example.xlsx', 'chemical_import_example.xlsx', 'chemical') }
          .to change(Chemical, :count).by_at_least(1)
      end

      it 'flags them as inventory samples' do
        run_import('public/xlsx/chemical_import_example.xlsx', 'chemical_import_example.xlsx', 'chemical')
        expect(Sample.where(inventory_sample: true).count).to be_positive
      end
    end

    # This is the path that imported nothing: the job called create_samples, which lands in the
    # raw_data branch and filters every molecule against an inchi_array its own guard requires to be
    # empty. It now calls import_from_file.
    context 'with the samples example SDF' do
      it 'creates samples' do
        expect { run_import('public/sdf/sample_import_example.sdf', 'sample_import_example.sdf', 'sample') }
          .to change(Sample, :count).by_at_least(1)
      end

      it 'does not report that no samples could be created' do
        result = run_import('public/sdf/sample_import_example.sdf', 'sample_import_example.sdf', 'sample')
        expect(result[:message]).not_to include('Could not create the samples')
      end
    end

    context 'with the chemicals example SDF' do
      it 'creates samples' do
        expect { run_import('public/sdf/chemical_import_example.sdf', 'chemical_import_example.sdf', 'chemical') }
          .to change(Sample, :count).by_at_least(1)
      end

      it 'creates the linked chemical records' do
        expect { run_import('public/sdf/chemical_import_example.sdf', 'chemical_import_example.sdf', 'chemical') }
          .to change(Chemical, :count).by_at_least(1)
      end
    end

    context 'with a .mol file' do
      it 'is accepted rather than rejected as an unsupported format' do
        result = run_import('public/sdf/sample_import_example.sdf', 'single_structure.mol', 'sample')
        expect(result[:message]).not_to include('Unsupported format')
      end
    end

    # The workbook templates ship with example rows, so they import like any other file. The SDF
    # templates are genuinely empty forms (property tags, no structures) and must fail cleanly rather
    # than raising or claiming success.
    context 'with the template forms' do
      it 'imports the samples workbook template without error' do
        result = run_import('public/xlsx/sample_import_template.xlsx', 'sample_import_template.xlsx', 'sample')
        expect(result[:status]).not_to eq('invalid')
      end

      it 'does not raise on the structure-less SDF template' do
        expect { run_import('public/sdf/sample_import_template.sdf', 'sample_import_template.sdf', 'sample') }
          .not_to raise_error
      end

      it 'does not claim to have imported anything from the structure-less SDF template' do
        result = run_import('public/sdf/sample_import_template.sdf', 'sample_import_template.sdf', 'sample')
        expect(result[:message]).to match(/Could not create the samples|No Molecule/)
      end
    end
  end

  describe 'import with column mapping and validation' do
    it 'creates samples from the mapped samples sheet' do
      file = csv_from_sheet('public/xlsx/sample_import_example.xlsx')
      attachment = create(
        :attachment,
        filename: 'mapped_import.csv',
        file_path: file.path,
        file_data: File.read(file.path),
        created_by: user.id,
        created_for: user.id,
      )
      ActiveJob::Status.store.clear

      expect do
        ImportSamplesJob.new.perform(
          collection_id: collection.id, user_id: user.id, attachment: attachment, import_type: 'sample',
        )
      end.to change(Sample, :count).by_at_least(1)
    ensure
      file&.close!
    end

    it 'creates samples and chemicals from the mapped chemicals sheet' do
      file = csv_from_sheet('public/xlsx/chemical_import_example.xlsx')
      attachment = create(
        :attachment,
        filename: 'mapped_chemicals.csv',
        file_path: file.path,
        file_data: File.read(file.path),
        created_by: user.id,
        created_for: user.id,
      )
      ActiveJob::Status.store.clear

      expect do
        ImportSamplesJob.new.perform(
          collection_id: collection.id, user_id: user.id, attachment: attachment, import_type: 'chemical',
        )
      end.to change(Sample, :count).by_at_least(1)
    ensure
      file&.close!
    end
  end
end
# rubocop:enable RSpec/DescribeClass
