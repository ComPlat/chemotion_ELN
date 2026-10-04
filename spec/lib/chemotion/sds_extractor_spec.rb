# frozen_string_literal: true

require 'rails_helper'

# Runs against vendor PDFs saved under public/safety_sheets where a checkout has them; the
# folder is not in the repository, so those examples skip. Cf. sds_extractor_layouts_spec.rb.
RSpec.describe Chemotion::SdsExtractor do
  include SdsSheetHelpers

  def sheet(relative)
    Rails.public_path.join('safety_sheets', relative).to_s
  end

  def vendor_sheet(relative)
    path = sheet(relative)
    skip("vendor sheet #{relative} is not on disk") unless File.file?(path)
    path
  end

  def extract(relative)
    described_class.extract(vendor_sheet(relative))
  end

  describe 'a Sigma sheet in the label-and-colon layout' do
    let(:result) { extract('merck/392693_c4f307a89d9fd8c2.pdf') }

    it 'names the vendor from the document', :aggregate_failures do
      expect(result['diagnostics']['vendor']).to eq('merck')
      expect(result['diagnostics']['sections_found']).to eq((1..16).to_a)
    end

    it 'reads the hazard codes of section 2.2 only' do
      expect(result['safetyPhrases']['h_statements'].keys)
        .to eq(%w[H225 H315 H318 H336 H412])
    end

    it 'reads the precautionary codes, combined ones intact' do
      expect(result['safetyPhrases']['p_statements'].keys)
        .to eq(['P210', 'P233', 'P273', 'P280', 'P303+P361+P353', 'P305+P351+P338'])
    end

    it 'looks the wording up locally' do
      expect(result['safetyPhrases']['h_statements']['H225'])
        .to eq(' Highly flammable liquid and vapour.')
    end

    it 'reads section 9 with the decimal comma normalised' do
      expect(result['properties']).to eq('form' => 'liquid', 'boiling_point' => '50 °C',
                                         'flash_point' => '4 °C',
                                         'vapor_pressure' => '437.001 hPa (20 °C)',
                                         'density' => '0.773 g/cm3 (25 °C)',
                                         'molecular_weight' => '17.03 g/mol')
    end

    it 'says the sheet uses a decimal comma' do
      expect(result['diagnostics']['properties']['decimal_style']).to eq('german')
    end

    it 'stops the label scan at the reduced labelling block' do
      expect(result['diagnostics']['notes'])
        .to include('label elements truncated at the reduced labelling block')
    end

    it 'derives the pictograms from the codes and says so', :aggregate_failures do
      expect(result['safetyPhrases']['pictograms']).to contain_exactly('GHS02', 'GHS05', 'GHS07')
      expect(result['diagnostics']['notes'])
        .to include('pictograms are images, so these are derived from the hazard codes')
      expect(result['diagnostics']['phrases']['pictograms_derived'])
        .to contain_exactly('GHS02', 'GHS05', 'GHS07')
    end
  end

  describe 'a second Sigma sheet of the same product line' do
    let(:result) { extract('merck/392685_854bfb9a03359d2b.pdf') }

    it 'reads its own codes rather than the neighbouring sheet' do
      expect(result['safetyPhrases']['h_statements'].keys).to eq(%w[H225 H315 H318 H410])
    end

    it 'reads section 9' do
      expect(result['properties']).to eq('form' => 'liquid', 'boiling_point' => '60 °C',
                                         'flash_point' => '3 °C',
                                         'density' => '0.785 g/cm3 (25 °C)',
                                         'molecular_weight' => '17.03 g/mol')
    end
  end

  describe 'a Sigma sheet for a non-hazardous substance' do
    let(:result) { extract('merck/08557_9f8f98252c9d6620.pdf') }

    it 'returns no phrases and separates that from a parse failure', :aggregate_failures do
      expect(result['safetyPhrases'])
        .to eq('h_statements' => {}, 'p_statements' => {}, 'pictograms' => [])
      expect(result['diagnostics']['notes'])
        .to include('the sheet declares the substance non-hazardous, so no codes are expected')
    end

    it 'keeps the one property the sheet states' do
      expect(result['properties']).to eq('form' => 'solid')
    end

    it 'records the rest as absent rather than storing a blank' do
      expect(result['diagnostics']['properties']['skipped']['melting_point']['reason'])
        .to eq('absent')
    end
  end

  describe 'the other sheet of that pair' do
    let(:result) { extract('merck/08555_05612b619edffb97.pdf') }

    it 'behaves the same', :aggregate_failures do
      expect(result['properties']).to eq('form' => 'solid')
      expect(result['safetyPhrases']['h_statements']).to be_empty
    end
  end

  describe 'a Thermo Fisher US sheet' do
    let(:result) { extract('fisher/AC133710010_web_ebb6ada3e5083e64.pdf') }

    it 'names the vendor from the OSHA banner, not the folder' do
      expect(result['diagnostics']['vendor']).to eq('thermofisher')
    end

    it 'matches the codes from the statement wording and says so', :aggregate_failures do
      expect(result['safetyPhrases']['h_statements'].keys).to eq(%w[H225 H314 H370 H301+H311+H331])
      expect(result['diagnostics']['phrases']['source']).to eq('wording')
      expect(result['diagnostics']['notes'])
        .to include('the sheet prints no codes, so these were matched from the statement wording')
      expect(result['diagnostics']['errors']).to be_empty
    end

    it 'leaves no statement of the label block unmatched', :aggregate_failures do
      expect(result['safetyPhrases']['p_statements'].keys).to include('P243', 'P305+P351+P338', 'P403+P233', 'P501')
      expect(result['diagnostics']['phrases']['unmatched_statements']).to be_empty
    end

    it 'derives the pictograms from the matched codes' do
      expect(result['safetyPhrases']['pictograms']).to contain_exactly('GHS02', 'GHS05', 'GHS06', 'GHS08')
    end

    it 'reads the whitespace-column section 9, preferring Celsius' do
      expect(result['properties']).to eq('form' => 'Liquid',
                                         'color' => 'Clear Colorless - Light yellow',
                                         'odor' => 'Ammonia-like', 'flash_point' => '14 °C',
                                         'density' => '0.770')
    end
  end

  describe 'a second Thermo Fisher US sheet' do
    let(:result) { extract('fisher/AC119341000_0f7f0f2ff78e6ab4.pdf') }

    it 'reads the hazard and precautionary statements', :aggregate_failures do
      expect(result['safetyPhrases']['h_statements'].keys).to eq(%w[H225 H318])
      expect(result['safetyPhrases']['p_statements'].keys)
        .to eq(%w[P280 P210 P233 P240 P241 P243 P242 P303+P361+P353 P305+P351+P338 P310 P370+P378 P403+P235 P501])
      expect(result['safetyPhrases']['pictograms']).to contain_exactly('GHS02', 'GHS05')
    end

    it 'stops before the hazards OSHA does not classify' do
      expect(result['safetyPhrases']['h_statements']).not_to have_key('H411')
    end
  end

  describe 'a Thermo Fisher sheet in the EU layout' do
    let(:result) { extract('thermofischer/342353_6595a345c109efaa.pdf') }

    it 'takes the layout from the headings rather than from the vendor', :aggregate_failures do
      expect(result['diagnostics']['vendor']).to eq('thermofisher')
      expect(result['diagnostics']['layout']).to eq('sigma')
      expect(result['diagnostics']['sections_found']).to eq((1..16).to_a)
    end

    it 'reads the printed codes', :aggregate_failures do
      expect(result['diagnostics']['phrases']['source']).to eq('codes')
      expect(result['safetyPhrases']['h_statements'].keys).to eq(%w[H315 H318 H302+H312+H332])
    end
  end

  describe 'a Thermo Fisher sheet whose label elements are "None required"' do
    let(:result) { extract('fisher/ALFAAJ67413_272e40ab2224c050.pdf') }

    it 'treats the substance as non-hazardous', :aggregate_failures do
      expect(result['safetyPhrases']['h_statements']).to be_empty
      expect(result['diagnostics']['notes']).to include(described_class::NOT_HAZARDOUS_NOTE)
    end
  end

  describe 'a sheet it cannot read' do
    it 'reports a missing file instead of raising, without the server path', :aggregate_failures do
      result = described_class.extract(sheet('merck/does-not-exist.pdf'))
      expect(result['properties']).to be_empty
      expect(result['diagnostics']['errors']).to eq(['no such file: does-not-exist.pdf'])
    end

    it 'gives up on a file that keeps ghostscript busy past the time limit', :aggregate_failures do
      timed_out = instance_double(Process::Status, success?: false, exitstatus: 124)
      allow(Open3).to receive(:capture3).and_return(['', '', timed_out])

      result = described_class.extract(Rails.root.join('spec/fixtures/upload.pdf').to_s)
      expect(result['diagnostics']['errors']).to include('ghostscript timed out')
      expect(Open3).to have_received(:capture3)
        .with('timeout', '-k', described_class::KILL_AFTER_SECONDS.to_s,
              described_class::GHOSTSCRIPT_TIMEOUT_SECONDS.to_s, 'gs', any_args)
    end

    it 'counts a run the time limit had to kill as timed out' do
      killed = instance_double(Process::Status, success?: false, exitstatus: 137)
      allow(Open3).to receive(:capture3).and_return(['', '', killed])

      result = described_class.extract(Rails.root.join('spec/fixtures/upload.pdf').to_s)
      expect(result['diagnostics']['errors']).to eq(['ghostscript timed out'])
    end

    context 'when it runs ghostscript' do
      let(:command) { [] }

      before do
        allow(Open3).to receive(:capture3).and_wrap_original do |original, *args|
          command.replace(args)
          original.call(*args)
        end
      end

      it 'runs it in safe mode on a bounded number of pages' do
        described_class.extract(Rails.root.join('spec/fixtures/upload.pdf').to_s)
        expect(command).to include('-dSAFER', "-dLastPage=#{described_class::MAX_PAGES}")
      end

      it 'passes the sheet as an absolute path, never as an option' do
        Dir.chdir(Rails.root.join('spec/fixtures')) { described_class.extract('upload.pdf') }
        expect(command.last).to eq(Rails.root.join('spec/fixtures/upload.pdf').to_s)
      end
    end

    it 'keeps the server path out of a ghostscript error', :aggregate_failures do
      path = Rails.root.join('spec/fixtures/upload.pdf').to_s
      failed = instance_double(Process::Status, success?: false, exitstatus: 1)
      allow(Open3).to receive(:capture3).and_return(['', "GPL Ghostscript: cannot open #{path}\n", failed])

      errors = described_class.extract(path)['diagnostics']['errors']
      expect(errors).to include('ghostscript failed: GPL Ghostscript: cannot open upload.pdf')
      expect(errors.join).not_to include(Rails.root.to_s)
    end

    it 'reports a sheet with no text layer', :aggregate_failures do
      dir = Dir.mktmpdir('sds_no_text')
      result = described_class.extract(sds_pdf_without_text(dir: dir))
      FileUtils.rm_rf(dir)
      expect(result['safetyPhrases'])
        .to eq('h_statements' => {}, 'p_statements' => {}, 'pictograms' => [])
      expect(result['diagnostics']['errors']).to include('ghostscript produced no text')
    end
  end

  describe '.extract_saved_sheet' do
    it 'reads a link as chemical_data stores it' do
      allow(described_class).to receive(:extract).and_return('read' => true)
      expect(described_class.extract_saved_sheet('/safety_sheets/merck/392693_c4f307a89d9fd8c2.pdf'))
        .to eq('read' => true)
      expect(described_class).to have_received(:extract)
        .with(Chemotion::GenerateFileHashUtils.safety_sheets_root.join('merck/392693_c4f307a89d9fd8c2.pdf').to_s)
    end

    it 'refuses a path outside the safety sheet folder', :aggregate_failures do
      result = described_class.extract_saved_sheet('../../../etc/passwd')
      expect(result['properties']).to be_empty
      expect(result['diagnostics']['errors']).to eq(['not a saved safety sheet path'])
    end

    it 'refuses a nested path that escapes the vendor folder' do
      result = described_class.extract_saved_sheet('/safety_sheets/merck/../../../etc/passwd.pdf')
      expect(result['diagnostics']['errors']).to eq(['not a saved safety sheet path'])
    end

    it 'refuses a path that is not a PDF or carries a trailing line', :aggregate_failures do
      expect(described_class.extract_saved_sheet('/safety_sheets/merck/sheet.txt')['diagnostics']['errors'])
        .to eq(['not a saved safety sheet path'])
      expect(described_class.extract_saved_sheet("/safety_sheets/merck/a.pdf\n/etc/passwd")['diagnostics']['errors'])
        .to eq(['not a saved safety sheet path'])
    end

    context 'with a symlink in the sheet folder' do
      let(:merck) { Chemotion::GenerateFileHashUtils.safety_sheets_root.join('merck') }
      let(:outside) { Pathname(Dir.mktmpdir('sds_outside')) }

      before do
        FileUtils.mkdir_p(merck)
        FileUtils.cp(Rails.root.join('spec/fixtures/upload.pdf'), outside.join('secret.pdf'))
        FileUtils.cp(Rails.root.join('spec/fixtures/upload.pdf'), merck.join('inside.pdf'))
        File.symlink(outside.join('secret.pdf'), merck.join('link.pdf'))
      end

      after { FileUtils.rm_rf(outside) }

      it 'refuses a link that leads out of it', :aggregate_failures do
        allow(described_class).to receive(:extract)
        result = described_class.extract_saved_sheet('/safety_sheets/merck/link.pdf')
        expect(result['diagnostics']['errors']).to eq(['not a saved safety sheet path'])
        expect(described_class).not_to have_received(:extract)
      end

      it 'reads a file that is inside it' do
        allow(described_class).to receive(:extract).and_return('read' => true)
        expect(described_class.extract_saved_sheet('/safety_sheets/merck/inside.pdf')).to eq('read' => true)
      end
    end
  end

  describe 'a German Sigma sheet' do
    let(:result) { extract('merck/45326_858ce38e0de45f17.pdf') }

    it 'finds all sixteen ABSCHNITT headings' do
      expect(result['diagnostics']['sections_found']).to eq((1..16).to_a)
    end

    it 'reads the codes, which carry no language', :aggregate_failures do
      expect(result['safetyPhrases']['h_statements'].keys)
        .to include('H301+H311+H331', 'H317', 'H318', 'H410')
      expect(result['safetyPhrases']['p_statements'].keys).to include('P305+P351+P338')
    end

    it 'reads the German section 9 labels', :aggregate_failures do
      expect(result['properties']).to include(
        'boiling_point' => '184 °C',
        'flash_point' => '70 °C',
        'decomposition_temperature' => '190 °C',
      )
    end

    it 'reads a comma decimal and a "bei" condition', :aggregate_failures do
      expect(result['properties']['density']).to eq('1.022 g/cm3 (25 °C)')
      expect(result['properties']['vapor_pressure']).to eq('0.49 hPa (20 °C)')
    end

    it 'derives the pictograms the codes imply, and says they are derived', :aggregate_failures do
      expect(result['safetyPhrases']['pictograms']).to contain_exactly('GHS05', 'GHS06', 'GHS08', 'GHS09')
      expect(result['diagnostics']['notes']).to include(a_string_matching(/derived from the hazard codes/))
    end

    it 'treats "Keine Daten verfügbar" as absent rather than as a value' do
      absent = result['diagnostics']['properties']['skipped'].values.select { |s| s['reason'] == 'absent' }
      expect(absent).not_to be_empty
      expect(result['properties'].values).not_to include(a_string_matching(/Keine Daten/i))
    end
  end

  describe 'a misfiled sheet' do
    let(:dir) { Dir.mktmpdir('sds_misfiled') }
    let(:misfiled) do
      FileUtils.mkdir_p(File.join(dir, 'merck'))
      sds_pdf_from_lines(['SAFETY DATA SHEET', '1. Identification', 'Fisher Scientific Company',
                          '2. Hazard(s) identification', *(3..8).map { |number| "#{number}. Section" },
                          '9. Physical and chemical properties',
                          'Flash Point                  14 °C'],
                         dir: File.join(dir, 'merck'), name: '392693_web_deadbeef.pdf')
    end

    after { FileUtils.rm_rf(dir) }

    it 'takes the vendor from the document, not from the path', :aggregate_failures do
      result = described_class.extract(misfiled)
      expect(result['diagnostics']['vendor']).to eq('thermofisher')
      expect(result['properties']['flash_point']).to eq('14 °C')
    end
  end
end
