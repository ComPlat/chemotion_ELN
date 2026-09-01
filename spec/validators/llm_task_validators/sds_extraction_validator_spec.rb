# frozen_string_literal: true

require 'rails_helper'

RSpec.describe LlmTaskValidators::SdsExtractionValidator do
  def validate(data)
    described_class.validate!(data)
  end

  describe 'rejecting unusable output' do
    it 'rejects a non-object' do
      expect { validate(['H225']) }.to raise_error(LlmTaskValidators::ValidationError, /Hash/)
    end

    it 'rejects an object with none of the core safety fields' do
      expect { validate({ 'notes' => 'nothing useful' }) }
        .to raise_error(LlmTaskValidators::ValidationError, /at least one of/)
    end

    it 'accepts an object carrying only one core field' do
      expect(validate({ 'signal_word' => 'Danger' })).to include('signal_word' => 'Danger')
    end
  end

  describe 'code normalisation' do
    it 'strips spacing inside hazard codes' do
      result = validate({ 'hazard_statements' => ['H 225', 'h319'] })

      expect(result['hazard_statements']).to eq(%w[H225 H319])
    end

    it 'keeps only the code when the statement text is appended' do
      result = validate({ 'hazard_statements' => ['H225: Highly flammable liquid and vapour'] })

      expect(result['hazard_statements']).to eq(['H225'])
    end

    it 'normalises EUH codes without mangling them into H codes' do
      result = validate({ 'hazard_statements' => ['EUH 001'], 'eu_h_statements' => ['euh066'] })

      expect(result['hazard_statements']).to eq(['EUH001'])
      expect(result['eu_h_statements']).to eq(['EUH066'])
    end

    it 'normalises combined precautionary codes' do
      # P-statements are not a core key on their own — an extraction with no
      # hazard information at all is rejected — so pair them with one.
      result = validate({ 'signal_word' => 'Danger',
                          'precautionary_statements' => ['P301 + P312', 'p280'] })

      expect(result['precautionary_statements']).to eq(%w[P301+P312 P280])
    end

    it 'normalises GHS pictogram codes so the pictogram lookup can find them' do
      result = validate({ 'ghs_codes' => ['ghs06', 'GHS 08'] })

      expect(result['ghs_codes']).to eq(%w[GHS06 GHS08])
    end

    it 'de-duplicates codes that normalise to the same value' do
      result = validate({ 'ghs_codes' => ['GHS06', 'ghs 06'] })

      expect(result['ghs_codes']).to eq(['GHS06'])
    end

    it 'leaves an entry that is not a code alone rather than discarding it' do
      result = validate({ 'hazard_statements' => ['Causes serious eye irritation'] })

      expect(result['hazard_statements']).to eq(['Causes serious eye irritation'])
    end
  end

  describe 'shape coercion' do
    it 'wraps a bare string in the list the prompt asked for' do
      result = validate({ 'hazard_statements' => 'H225' })

      expect(result['hazard_statements']).to eq(['H225'])
    end

    it 'drops blank entries from lists' do
      result = validate({ 'ghs_codes' => ['GHS06', '', nil] })

      expect(result['ghs_codes']).to eq(['GHS06'])
    end

    it 'coerces a stringified boolean for is_mixture' do
      expect(validate({ 'chemical_name' => 'x', 'is_mixture' => 'false' })['is_mixture']).to be false
      expect(validate({ 'chemical_name' => 'x', 'is_mixture' => 'true' })['is_mixture']).to be true
    end

    it 'drops properties when it is not an object' do
      result = validate({ 'chemical_name' => 'Phenol', 'properties' => 'boiling point 182 C' })

      expect(result).not_to have_key('properties')
      expect(result['chemical_name']).to eq('Phenol')
    end

    it 'keeps only object entries in mixture_components' do
      result = validate(
        'mixture_components' => [
          { 'name' => 'Formaldehyde', 'cas_number' => '50-00-0' },
          'Methanol 10%',
        ],
      )

      expect(result['mixture_components']).to eq([{ 'name' => 'Formaldehyde', 'cas_number' => '50-00-0' }])
    end
  end

  describe 'a realistic full extraction' do
    let(:raw) do
      {
        'chemical_name' => 'Phenol',
        'cas_number' => '108-95-2',
        'is_mixture' => 'false',
        'signal_word' => 'Danger',
        'hazard_statements' => ['H 301', 'H314: Causes severe skin burns', 'h341'],
        'precautionary_statements' => ['P280', 'P301 + P330 + P331'],
        'ghs_codes' => ['ghs05', 'GHS 06', 'GHS08'],
        'properties' => { 'melting_point' => '40.5 °C', 'boiling_point' => '182 °C' },
      }
    end

    it 'normalises every code field' do
      result = validate(raw)

      expect(result['hazard_statements']).to eq(%w[H301 H314 H341])
      expect(result['precautionary_statements']).to eq(%w[P280 P301+P330+P331])
      expect(result['ghs_codes']).to eq(%w[GHS05 GHS06 GHS08])
    end

    it 'leaves the non-code fields intact' do
      result = validate(raw)

      expect(result['is_mixture']).to be false
      expect(result['properties']).to eq({ 'melting_point' => '40.5 °C', 'boiling_point' => '182 °C' })
      expect(result['cas_number']).to eq('108-95-2')
    end

    it 'produces ghs_codes that ChemicalsService.construct_pictograms accepts' do
      codes = validate(raw)['ghs_codes']

      expect(Chemotion::ChemicalsService.construct_pictograms(codes)).to eq(codes)
    end
  end
end
