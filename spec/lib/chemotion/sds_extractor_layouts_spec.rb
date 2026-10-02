# frozen_string_literal: true

require 'rails_helper'

# Reads sheets built from the lines below, so each layout is pinned without a vendor PDF.
RSpec.describe Chemotion::SdsExtractor do
  include SdsSheetHelpers

  let(:dir) { Dir.mktmpdir('sds_layouts') }

  after { FileUtils.rm_rf(dir) }

  def extract_lines(lines)
    described_class.extract(sds_pdf_from_lines(lines, dir: dir))
  end

  def us_sheet(label_elements, vendor: 'Fisher Scientific Company')
    ['SAFETY DATA SHEET', '1. Identification', 'Company', vendor,
     '2. Hazard(s) identification', 'Classification', 'Flammable liquids Category 2',
     'Label Elements', *label_elements,
     'Hazards not otherwise classified (HNOC)', 'Toxic to aquatic life with long lasting effects',
     '3. Composition/information on Ingredients', '9. Physical and chemical properties']
  end

  def eu_sheet(label_elements, vendor: 'Thermo Fisher Scientific')
    ['SAFETY DATA SHEET', 'SECTION 1: IDENTIFICATION', vendor, 'SECTION 2: HAZARDS IDENTIFICATION',
     '2.1. Classification of the substance or mixture', '2.2. Label elements', *label_elements,
     '2.3. Other hazards', 'SECTION 3: COMPOSITION/INFORMATION ON INGREDIENTS',
     'SECTION 9: PHYSICAL AND CHEMICAL PROPERTIES']
  end

  describe 'a US sheet that prints the statements without codes' do
    let(:result) do
      extract_lines(us_sheet(['Signal Word', 'Danger', 'Hazard Statements',
                              'Highly flammable liquid and vapor', 'Causes serious eye damage',
                              'Precautionary Statements', 'Prevention',
                              'Keep away from heat, hot surfaces, sparks, open flames and other',
                              'ignition sources. No smoking', 'Take action to prevent static discharges',
                              'Eyes',
                              'IF IN EYES: Rinse cautiously with water for several minutes. ' \
                              'Remove contact lenses, if present and easy to do. Continue rinsing',
                              'Absorb spillage to prevent material damage']))
    end

    it 'matches the codes from the wording', :aggregate_failures do
      expect(result['safetyPhrases']['h_statements'].keys).to eq(%w[H225 H318])
      expect(result['safetyPhrases']['p_statements'].keys).to eq(%w[P210 P243 P305+P351+P338])
      expect(result['diagnostics']['phrases']['source']).to eq('wording')
    end

    it 'looks the wording up in the local catalogue' do
      expect(result['safetyPhrases']['h_statements']['H225']).to eq(' Highly flammable liquid and vapour.')
    end

    it 'derives the pictograms from the matched hazard codes' do
      expect(result['safetyPhrases']['pictograms']).to contain_exactly('GHS02', 'GHS05')
    end

    it 'leaves the hazards OSHA does not classify out' do
      expect(result['safetyPhrases']['h_statements']).not_to have_key('H411')
    end

    it 'reports the statement it could not match, and each match with its score', :aggregate_failures do
      expect(result['diagnostics']['phrases']['unmatched_statements'])
        .to eq(['Absorb spillage to prevent material damage'])
      expect(result['diagnostics']['phrases']['matched'].first)
        .to eq('text' => 'Highly flammable liquid and vapor', 'code' => 'H225', 'score' => 1.0)
    end

    it 'names the vendor and the layout', :aggregate_failures do
      expect(result['diagnostics']['vendor']).to eq('thermofisher')
      expect(result['diagnostics']['layout']).to eq('fisher')
      expect(result['diagnostics']['notes'])
        .to include('the sheet prints no codes, so these were matched from the statement wording')
    end
  end

  describe 'a US sheet whose label block holds no recognisable statement' do
    let(:result) { extract_lines(us_sheet(['Signal Word', 'None'])) }

    it 'returns no phrases and says why', :aggregate_failures do
      expect(result['safetyPhrases']['h_statements']).to be_empty
      expect(result['safetyPhrases']['pictograms']).to be_empty
      expect(result['diagnostics']['notes'])
        .to include('no H or P codes in the text layer of the bounded section, and no statement matched')
    end
  end

  describe 'a Thermo Fisher sheet in the EU layout' do
    let(:result) do
      extract_lines(eu_sheet(['Hazard Statements', 'H315 - Causes skin irritation',
                              'H302 + H312 + H332 - Harmful if swallowed, in contact with skin or if inhaled',
                              'Precautionary Statements', 'P280 - Wear protective gloves']))
    end

    it 'takes the layout from the headings, not from the vendor', :aggregate_failures do
      expect(result['diagnostics']['vendor']).to eq('thermofisher')
      expect(result['diagnostics']['layout']).to eq('sigma')
    end

    it 'reads the printed codes rather than the wording', :aggregate_failures do
      expect(result['diagnostics']['phrases']['source']).to eq('codes')
      expect(result['safetyPhrases']['h_statements'].keys).to eq(%w[H315 H302+H312+H332])
      expect(result['safetyPhrases']['p_statements'].keys).to eq(%w[P280])
    end
  end

  describe 'an EU sheet whose label elements are not required' do
    let(:result) { extract_lines(eu_sheet(['None required'])) }

    it 'treats the substance as non-hazardous instead of matching wording', :aggregate_failures do
      expect(result['diagnostics']['phrases']['source']).to eq('none')
      expect(result['diagnostics']['notes']).to include(described_class::NOT_HAZARDOUS_NOTE)
      expect(result['diagnostics']['phrases']).not_to have_key('unmatched_statements')
    end
  end

  describe 'a Sigma sheet that states no hazard statement' do
    let(:result) do
      extract_lines(eu_sheet(['No hazard pictogram, no signal word, no hazard statement(s) required.'],
                             vendor: 'Sigma-Aldrich'))
    end

    it 'treats the substance as non-hazardous', :aggregate_failures do
      expect(result['diagnostics']['vendor']).to eq('merck')
      expect(result['diagnostics']['phrases']['source']).to eq('none')
    end
  end

  describe 'a document with no vendor mark' do
    let(:result) { extract_lines(us_sheet(['Highly flammable liquid and vapor'], vendor: 'Some Supplier')) }

    it 'reads nothing and says the vendor is unknown', :aggregate_failures do
      expect(result['safetyPhrases']['h_statements']).to be_empty
      expect(result['properties']).to be_empty
      expect(result['diagnostics']['notes']).to include('vendor fingerprint inconclusive')
    end
  end

  describe 'a document that carries both vendors equally' do
    let(:result) do
      extract_lines(us_sheet(['Highly flammable liquid and vapor'], vendor: 'Sigma-Aldrich / Alfa Aesar'))
    end

    it 'refuses to pick one' do
      expect(result['diagnostics']['notes']).to include('vendor fingerprint inconclusive')
    end
  end
end
