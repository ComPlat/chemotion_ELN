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
                              'May form combustible dust concentrations in air']))
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
        .to eq(['May form combustible dust concentrations in air'])
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

  describe 'a German Sigma sheet' do
    let(:result) do
      extract_lines(['SICHERHEITSDATENBLATT', 'ABSCHNITT 1: Bezeichnung des Stoffs', 'Sigma-Aldrich Chemie GmbH',
                     'ABSCHNITT 2: Mögliche Gefahren', '2.2 Kennzeichnungselemente',
                     'H301 + H311 + H331 Giftig bei Verschlucken, Hautkontakt oder Einatmen.',
                     'H360FD Kann die Fruchtbarkeit beeinträchtigen. Kann das Kind im Mutterleib schädigen.',
                     'P305 + P351 + P338 BEI KONTAKT MIT DEN AUGEN: Einige Minuten lang behutsam mit Wasser spülen.',
                     'Reduzierte Kennzeichnung (<= 125 ml)', 'H315 Verursacht Hautreizungen.',
                     '2.3 Sonstige Gefahren', 'ABSCHNITT 3: Zusammensetzung',
                     'H302 Gesundheitsschädlich bei Verschlucken.',
                     *(4..8).map { |number| "ABSCHNITT #{number}: Abschnitt" },
                     'ABSCHNITT 9: Physikalische und chemische Eigenschaften',
                     'Flammpunkt                 :  70 °C', 'Dichte                     :  1,022 g/cm3 bei 25 °C',
                     'Dampfdruck                 :  0,49 hPa bei 20 °C',
                     'Viskosität                 :  Keine Daten verfügbar', 'ABSCHNITT 10: Stabilität'])
    end

    it 'reads the codes of section 2.2 alone, combined ones intact', :aggregate_failures do
      expect(result['safetyPhrases']['h_statements'].keys).to eq(%w[H301+H311+H331 H360FD])
      expect(result['safetyPhrases']['p_statements'].keys).to eq(%w[P305+P351+P338])
    end

    it 'derives the pictograms through the category letters of a code' do
      expect(result['safetyPhrases']['pictograms']).to contain_exactly('GHS06', 'GHS08')
    end

    it 'reads the German section 9 labels with a comma decimal and a "bei" condition', :aggregate_failures do
      expect(result['properties']).to eq('flash_point' => '70 °C', 'density' => '1.022 g/cm3 (25 °C)',
                                         'vapor_pressure' => '0.49 hPa (20 °C)')
      expect(result['diagnostics']['properties']['skipped']['viscosity']['reason']).to eq('absent')
    end
  end

  describe 'a US sheet with a negated statement' do
    let(:result) do
      extract_lines(us_sheet(['Hazard Statements', 'Causes skin irritation', 'Precautionary Statements',
                              'Do not use water to extinguish']))
    end

    it 'matches the statement and leaves the negated one unmatched', :aggregate_failures do
      expect(result['safetyPhrases']['h_statements'].keys).to eq(%w[H315])
      expect(result['safetyPhrases']['p_statements']).to be_empty
      expect(result['diagnostics']['phrases']['unmatched_statements']).to eq(['Do not use water to extinguish'])
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
