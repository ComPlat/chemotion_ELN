# frozen_string_literal: true

require 'rails_helper'

# Runs against the safety sheets saved under public/safety_sheets, so it measures the
# extractor on real vendor PDFs rather than on a transcription of them.
RSpec.describe Chemotion::SdsExtractor do
  def sheet(relative)
    Rails.public_path.join('safety_sheets', relative).to_s
  end

  def extract(relative)
    described_class.extract(sheet(relative))
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

    it 'returns no pictograms and says why', :aggregate_failures do
      expect(result['safetyPhrases']['pictograms']).to eq([])
      expect(result['diagnostics']['notes'])
        .to include('pictograms are images; the text layer carries no GHS codes')
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

    it 'degrades to no phrases because the sheet carries no codes', :aggregate_failures do
      expect(result['safetyPhrases']['h_statements']).to be_empty
      expect(result['diagnostics']['notes'])
        .to include('no H or P codes in the text layer of the bounded section')
      expect(result['diagnostics']['errors']).to be_empty
    end

    it 'reads the whitespace-column section 9, preferring Celsius' do
      expect(result['properties']).to eq('form' => 'Liquid',
                                         'color' => 'Clear Colorless - Light yellow',
                                         'odor' => 'Ammonia-like', 'flash_point' => '14 °C',
                                         'density' => '0.770')
    end
  end

  describe 'a sheet it cannot read' do
    it 'reports a missing file instead of raising', :aggregate_failures do
      result = described_class.extract(sheet('merck/does-not-exist.pdf'))
      expect(result['properties']).to be_empty
      expect(result['diagnostics']['errors'].first).to start_with('no such file')
    end

    it 'reports a file ghostscript cannot open', :aggregate_failures do
      result = extract('merck/131377_web_e2673f96a32fe5d8.pdf')
      expect(result['safetyPhrases'])
        .to eq('h_statements' => {}, 'p_statements' => {}, 'pictograms' => [])
      expect(result['diagnostics']['errors']).to include('ghostscript produced no text')
    end
  end

  describe '.extract_saved_sheet' do
    it 'reads a link as chemical_data stores it' do
      result = described_class.extract_saved_sheet('/safety_sheets/merck/392693_c4f307a89d9fd8c2.pdf')
      expect(result['properties']['flash_point']).to eq('4 °C')
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
  end

  describe 'a misfiled sheet' do
    let(:misfiled) { Rails.root.join('tmp/sds_extractor_spec/merck/392693_web_deadbeef.pdf') }

    before do
      FileUtils.mkdir_p(File.dirname(misfiled))
      FileUtils.cp(sheet('fisher/AC133710010_web_ebb6ada3e5083e64.pdf'), misfiled)
    end

    after { FileUtils.rm_rf(Rails.root.join('tmp/sds_extractor_spec')) }

    it 'takes the vendor from the document, not from the path', :aggregate_failures do
      result = described_class.extract(misfiled.to_s)
      expect(result['diagnostics']['vendor']).to eq('thermofisher')
      expect(result['properties']['flash_point']).to eq('14 °C')
    end
  end
end
