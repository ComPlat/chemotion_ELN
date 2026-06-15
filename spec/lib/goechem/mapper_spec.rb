# frozen_string_literal: true

require 'rails_helper'
require_relative '../../../lib/goechem/goechem'
require_relative '../../../lib/goechem/mapper'

# Path mirrors lib/goechem/ (module is GoeChem, not Goe::Chem)
RSpec.describe GoeChem::Mapper do # rubocop:disable RSpec/SpecFilePathFormat
  # ---------------------------------------------------------------------------
  # Fixtures — minimal GoeChem CHEMIKALIENBESTAND row shapes
  # ---------------------------------------------------------------------------
  let(:liquid_row) do
    {
      'id' => '42',
      'cid' => '107',
      'name' => 'Acetonitrile',
      'cas' => '75-05-8',
      'casnr' => '75-05-8',
      'inh' => 1750,
      'einh' => 'ML',
      'cont' => 500,
      'firma' => 'Sigma-Aldrich',
      'hersteller' => 'Merck',
      'katnr' => 'A001',
      'prodnr' => 'P99',
      'gebaeude' => '30.42',
      'raum' => '101',
      'platz' => 'Schrank 3',
      'fp' => '2',
      'hhinweis' => 'H225 H302',
      'phinweis' => 'P210',
      'charge' => 'BCDE1234',
      'eu_referenz' => 'EU-REF-001',
      'regzeit' => 1_700_000_000,
    }
  end

  let(:solid_row) do
    {
      'id' => '99',
      'name' => 'Caffeine',
      'cas' => '58-08-2',
      'inh' => 250,
      'einh' => 'G',
      'cont' => 250,
      'smp' => '234-238 Â°C',
    }
  end

  let(:mg_row) do
    { 'id' => '11', 'name' => 'NaCl', 'inh' => 50, 'einh' => 'MG' }
  end

  let(:pcs_row) do
    { 'id' => '22', 'name' => 'Vials', 'inh' => 12, 'einh' => 'ST' }
  end

  let(:empty_inh_row) do
    { 'id' => '77', 'name' => 'Empty Bottle', 'inh' => 0, 'einh' => 'ML' }
  end

  let(:unknown_unit_row) do
    { 'id' => '88', 'name' => 'Something', 'inh' => 10, 'einh' => '-1' }
  end

  let(:integer_unknown_unit_row) do
    { 'id' => '89', 'name' => 'Other', 'inh' => 5, 'einh' => -1 }
  end

  let(:no_location_row) do
    { 'id' => '55', 'name' => 'Reagent', 'inh' => 100, 'einh' => 'ML' }
  end

  # ---------------------------------------------------------------------------
  # UNIT_MAP
  # ---------------------------------------------------------------------------
  describe 'UNIT_MAP' do
    it 'maps GoeChem uppercase liquid units to lowercase' do
      expect(described_class::UNIT_MAP['ML']).to eq('ml')
      expect(described_class::UNIT_MAP['L']).to  eq('l')
    end

    it 'maps GoeChem uppercase solid units to lowercase' do
      expect(described_class::UNIT_MAP['G']).to  eq('g')
      expect(described_class::UNIT_MAP['MG']).to eq('mg')
      expect(described_class::UNIT_MAP['KG']).to eq('kg')
    end

    it 'maps Stück (ST) to pcs' do
      expect(described_class::UNIT_MAP['ST']).to eq('pcs')
    end

    it 'maps unknown/missing units to nil' do
      expect(described_class::UNIT_MAP['-1']).to  be_nil
      expect(described_class::UNIT_MAP[-1]).to    be_nil
      expect(described_class::UNIT_MAP['']).to    be_nil
    end
  end

  # ---------------------------------------------------------------------------
  # to_sample_attrs
  # ---------------------------------------------------------------------------
  describe '.to_sample_attrs' do
    context 'with a liquid chemical (ML)' do
      subject(:attrs) { described_class.to_sample_attrs(liquid_row) }

      it 'maps name from GoeChem name field' do
        expect(attrs[:name]).to eq('Acetonitrile')
      end

      it 'mirrors volume in real_amount_value for sample-list display' do
        expect(attrs[:real_amount_value]).to eq(1750.0)
      end

      it 'normalizes ML to ml in real_amount_unit' do
        expect(attrs[:real_amount_unit]).to eq('ml')
      end

      it 'sets inventory_sample flag' do
        expect(attrs[:inventory_sample]).to be true
      end

      it 'builds location string from Gebäude/Raum/Platz fields' do
        expect(attrs[:location]).to eq('Geb. 30.42, Raum 101, Platz Schrank 3')
      end

      it 'stores GoeChem batch ID in xref as string' do
        expect(attrs[:xref]['goechem_id']).to eq('42')
      end

      it 'stores GoeChem compound ID in xref' do
        expect(attrs[:xref]['goechem_cid']).to eq('107')
      end

      it 'stores CAS in xref for quick access' do
        expect(attrs[:xref]['cas']).to eq('75-05-8')
      end

      it 'stores batch number in xref' do
        expect(attrs[:xref]['batch']).to eq('BCDE1234')
      end

      it 'stores EU reference in xref' do
        expect(attrs[:xref]['order_ref']).to eq('EU-REF-001')
      end

      it 'includes goechem_synced timestamp in xref' do
        expect(attrs[:xref]['goechem_synced']).to match(/\d{4}-\d{2}-\d{2}T/)
      end

      it 'stores flash_point in xref as {unit, value} (matches ChemicalTab convention)' do
        expect(attrs[:xref]['flash_point']).to eq({ 'unit' => '°C', 'value' => '2' })
      end
    end

    context 'with a solid chemical (G) with mojibake temperature' do
      subject(:attrs) { described_class.to_sample_attrs(solid_row) }

      it 'normalizes G to g' do
        expect(attrs[:real_amount_unit]).to eq('g')
      end

      it 'parses temperature range with mojibake (Â°C → numrange Ruby Range)' do
        expect(attrs[:melting_point]).to eq(234.0..238.0)
      end
    end

    context 'with unknown unit (-1 string)' do
      subject(:attrs) { described_class.to_sample_attrs(unknown_unit_row) }

      it 'sets real_amount_unit to nil and omits it' do
        expect(attrs[:real_amount_unit]).to be_nil
      end
    end

    context 'with unknown unit (-1 integer from API)' do
      subject(:attrs) { described_class.to_sample_attrs(integer_unknown_unit_row) }

      it 'handles integer -1 without raising' do
        expect { attrs }.not_to raise_error
      end
    end

    context 'with no location fields' do
      subject(:attrs) { described_class.to_sample_attrs(no_location_row) }

      it 'omits location when no building/room/bench in row' do
        expect(attrs[:location]).to be_nil
      end
    end
  end

  # ---------------------------------------------------------------------------
  # to_chemical_attrs — canonical Chemical tab fields
  # ---------------------------------------------------------------------------
  describe '.to_chemical_attrs' do
    context 'with a liquid chemical (ML unit)' do
      subject(:attrs) { described_class.to_chemical_attrs(liquid_row) }

      let(:data)      { attrs[:chemical_data][0] }

      it 'sets cas on Chemical' do
        expect(attrs[:cas]).to eq('75-05-8')
      end

      it 'produces a single-entry chemical_data array' do
        expect(attrs[:chemical_data].length).to eq(1)
      end

      it 'routes ML to chemical_data[0]["volume"] (not amount)' do
        expect(data['volume']).to eq({ 'value' => 1750.0, 'unit' => 'ml' })
      end

      it 'does not set amount for a liquid' do
        expect(data['amount']).to be_nil
      end

      it 'sets status to Available when inh > 0' do
        expect(data['status']).to eq('Available')
      end

      # rubocop:disable RSpec/NestedGroups -- grouping mirrors the chemical_data JSON structure
      describe 'goechemProductInfo (native GoeChem field names)' do
        subject(:info) { data['goechemProductInfo'] }

        it 'stores firma under native key' do
          expect(info['firma']).to eq('Sigma-Aldrich')
        end

        it 'stores hersteller under native key' do
          expect(info['hersteller']).to eq('Merck')
        end

        it 'stores katnr under native key' do
          expect(info['katnr']).to eq('A001')
        end

        it 'stores prodnr under native key' do
          expect(info['prodnr']).to eq('P99')
        end

        it 'stores hhinweis (H phrases raw string) under native key' do
          expect(info['hhinweis']).to eq('H225 H302')
        end

        it 'stores phinweis (P phrases raw string) under native key' do
          expect(info['phinweis']).to eq('P210')
        end

        it 'stores fp (flash point) under native key' do
          expect(info['fp']).to eq('2')
        end

        it 'stores charge (batch) under native key' do
          expect(info['charge']).to eq('BCDE1234')
        end

        it 'stores eu_referenz under native key' do
          expect(info['eu_referenz']).to eq('EU-REF-001')
        end

        it 'stores regzeit (raw Unix timestamp) under native key' do
          expect(info['regzeit']).to eq(1_700_000_000)
        end

        it 'stores cont (package size) under native key' do
          expect(info['cont']).to eq(500)
        end

        it 'stores einh (unit) under native key' do
          expect(info['einh']).to eq('ML')
        end

        it 'stores inh (remaining amount) under native key' do
          expect(info['inh']).to eq(1750)
        end
      end

      describe 'safetyPhrases (Chemotion-native format)' do
        subject(:phrases) { data['safetyPhrases'] }

        it 'includes h_statements expanded from hhinweis codes' do
          expect(phrases['h_statements']).to include('H225', 'H302')
        end

        it 'includes p_statements expanded from phinweis codes' do
          expect(phrases['p_statements']).to include('P210')
        end

        it 'includes pictograms array (empty — GoeChem does not supply GHS codes)' do
          expect(phrases['pictograms']).to eq([])
        end
      end
      # rubocop:enable RSpec/NestedGroups
    end

    context 'with a solid chemical (G unit)' do
      subject(:attrs) { described_class.to_chemical_attrs(solid_row) }

      let(:data)      { attrs[:chemical_data][0] }

      it 'routes G to chemical_data[0]["amount"] (not volume)' do
        expect(data['amount']).to eq({ 'value' => 250.0, 'unit' => 'g' })
      end

      it 'does not set volume for a solid' do
        expect(data['volume']).to be_nil
      end
    end

    context 'with MG unit' do
      subject(:data) { described_class.to_chemical_attrs(mg_row)[:chemical_data][0] }

      it 'routes MG to amount with unit mg' do
        expect(data['amount']).to eq({ 'value' => 50.0, 'unit' => 'mg' })
      end
    end

    context 'with ST (Stück / pieces) unit' do
      subject(:data) { described_class.to_chemical_attrs(pcs_row)[:chemical_data][0] }

      it 'routes ST to amount with unit pcs' do
        expect(data['amount']).to eq({ 'value' => 12.0, 'unit' => 'pcs' })
      end
    end

    context 'with empty bottle (inh = 0, ML)' do
      subject(:data) { described_class.to_chemical_attrs(empty_inh_row)[:chemical_data][0] }

      it 'sets volume to zero' do
        expect(data['volume']).to eq({ 'value' => 0.0, 'unit' => 'ml' })
      end

      it 'sets status to Empty' do
        expect(data['status']).to eq('Empty')
      end
    end

    context 'with unknown unit (-1 string)' do
      subject(:data) { described_class.to_chemical_attrs(unknown_unit_row)[:chemical_data][0] }

      it 'sets neither amount nor volume' do
        expect(data['amount']).to be_nil
        expect(data['volume']).to be_nil
      end

      it 'still sets status from inh value' do
        expect(data['status']).to eq('Available')
      end
    end

    context 'when cas is present only in casnr field' do
      let(:row) { { 'id' => '1', 'casnr' => '67-56-1', 'inh' => 10, 'einh' => 'ML' } }

      it 'falls back to casnr for cas' do
        expect(described_class.to_chemical_attrs(row)[:cas]).to eq('67-56-1')
      end
    end
  end
end
