# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Import::ImportSamples' do
  let(:user_id) { create(:user).id }
  let(:collection_id) { create(:collection).id }
  let(:file_path) { 'spec/fixtures/import/sample_import_template.xlsx' }
  let(:file_name) { File.basename(file_path) }
  let(:attachment) do
    create(:attachment, :with_sample_import_template,
           created_by: user_id,
           created_for: user_id)
  end
  let(:importer) { Import::ImportSamples.new(attachment, collection_id, user_id, attachment.filename, 'sample') }
  let(:sample) { create(:sample) }

  before do
    stub_rest_request('BYHVGQHIAFURIL-UHFFFAOYSA-N')
    stub_rest_request('PNNRZXFUPQQZSO-UHFFFAOYSA-N')
    stub_rest_request('UHOVQNZJYSORNB-UHFFFAOYSA-N')
    stub_rest_request('YMWUJEATGCHHMB-UHFFFAOYSA-N')
    stub_rest_request('QPUYECUOLPXSFR-UHFFFAOYSA-N')
    stub_rest_request('AUHZEENZYGFFBQ-UHFFFAOYSA-N')
    stub_rest_request('RYYVLZVUVIJVGH-UHFFFAOYSA-N')
    stub_rest_request('KWMALILVJYNFKE-UHFFFAOYSA-N')
  end

  describe '.format_to_interval_syntax' do
    let(:processed_row) { importer.send(:format_to_interval_syntax, unprocessed_row) }

    context 'with single integer number' do
      let(:unprocessed_row) { '1' }

      it 'returns single number' do
        expect(processed_row).to eq '[1.0, Infinity]'
      end
    end

    context 'with single float number' do
      let(:unprocessed_row) { '1.234' }

      it 'returns single number' do
        expect(processed_row).to eq '[1.234, Infinity]'
      end
    end

    context 'with range float/float number' do
      let(:unprocessed_row) { '1.234-2.345' }

      it 'returns interval' do
        expect(processed_row).to eq '[1.234, 2.345]'
      end
    end

    context 'with range float/int number' do
      let(:unprocessed_row) { '1.234-1' }

      it 'returns interval' do
        expect(processed_row).to eq '[1.234, 1.0]'
      end
    end

    context 'with invalide format' do
      let(:unprocessed_row) { '1.23.4-1' }

      it 'returns infinity interval' do
        expect(processed_row).to eq '[-Infinity, Infinity]'
      end
    end

    context 'with range float/negative int number' do
      let(:unprocessed_row) { '1.234--1' }

      it 'returns interval' do
        expect(processed_row).to eq '[1.234, -1.0]'
      end
    end
  end

  describe '.import sample' do
    let(:import_result) { importer.process }
    let(:unprocessed_row) { '1' }

    context 'with including 3 samples' do
      it 'sample import is successful' do
        expect(import_result[:status]).to eq 'ok'
      end

      it 'new molecules were imported in database' do
        import_result
        sample = Sample.find_by(name: 'Test 1')
        molecule_names = sample.molecule.molecule_names
        expect(molecule_names).to be_present
      end

      it 'schedules exactly one PubchemLookupJob for the whole import instead of one per molecule' do
        started_at = Time.current
        allow(PubchemLookupJob).to receive(:perform_later)

        import_result

        expect(PubchemLookupJob).to have_received(:perform_later).once
        expect(PubchemLookupJob).to have_received(:perform_later).with(nil, created_after: be >= started_at)
      end

      # The savepoint that makes a real (Postgres-level) collision survivable inside this
      # transaction is covered where it lives, in
      # spec/models/molecule_spec.rb '.find_or_create_by_molfile'.
    end
  end

  def stub_rest_request(identifier)
    stub_request(:get, "http://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchikey/#{identifier}/record/JSON")
      .with(
        headers: {
          'Accept' => '*/*',
          'Accept-Encoding' => 'gzip;q=1.0,deflate;q=0.6,identity;q=0.3',
          'Content-Type' => 'text/json',
          'User-Agent' => 'Ruby',
        },
      )
      .to_return(status: 200, body: '', headers: {})
  end

  describe '#format_molarity_value' do
    it 'returns nil if value is empty' do
      expect(importer.format_molarity_value('', 'value')).to be_nil
    end

    it 'returns the value as a float if type is value' do
      expect(importer.format_molarity_value('1.5', 'value')).to eq(1.5)
    end

    it 'returns M if the value contains m/L or M' do
      expect(importer.format_molarity_value('0.5 m/L', 'unit')).to eq('M')
      expect(importer.format_molarity_value('0.5 M', 'unit')).to eq('M')
    end

    it 'returns nil if the value does not contain a valid molarity unit' do
      expect(importer.format_molarity_value('0.5', 'unit')).to be_nil
    end
  end

  describe '#to_value_unit_format' do
    context 'when db_column is density' do
      it 'extracts the numerical value and unit when value contains valid density unit' do
        result = importer.to_value_unit_format('1.25 g/ml', 'density')
        expect(result).to eq({ value: 1.25, unit: 'g/ml' })
      end

      it 'returns nil for both value and unit when value does not contain a valid unit' do
        result = importer.to_value_unit_format('1.25 kg/L', 'density')
        expect(result).to eq({ value: nil, unit: nil })
      end
    end

    context 'when db_column is molarity' do
      it 'extracts the numerical value and unit when value contains valid molarity unit' do
        result = importer.to_value_unit_format('0.5 M', 'molarity')
        expect(result).to eq({ value: 0.5, unit: 'M' })
      end

      it 'returns expected value and unit if molarity unit is valid' do
        result = importer.to_value_unit_format('0.7 mol/L', 'molarity')
        expect(result).to eq({ value: 0.7, unit: 'M' })
      end
    end

    context 'when db_column is flash_point' do
      it 'extracts the numerical value and unit when value contains valid flash point unit' do
        result = importer.to_value_unit_format('100 °C', 'flash_point')
        expect(result).to eq({ value: 100, unit: '°C' })
      end

      it 'returns nil for both value and unit when value does not contain a valid flash point unit' do
        result = importer.to_value_unit_format('100 Koma', 'flash_point')
        expect(result).to eq({ value: nil, unit: nil })
      end
    end

    context 'when value is nil or empty' do
      it 'returns nil for both value and unit when value is nil' do
        result = importer.to_value_unit_format(nil, 'density')
        expect(result).to eq({ value: nil, unit: nil })
      end

      it 'returns nil for both value and unit when value is an empty string' do
        result = importer.to_value_unit_format('', 'density')
        expect(result).to eq({ value: nil, unit: nil })
      end
    end

    context 'when value does not contain a numerical value' do
      it 'returns nil for both value and unit when no numerical value is found' do
        result = importer.to_value_unit_format('abc g/ml', 'density')
        expect(result).to eq({ value: nil, unit: nil })
      end
    end
  end

  describe '#handle_sample_fields' do
    it 'update sample flash point attribute with expected values' do
      importer.handle_sample_fields(sample, 'flash_point', { value: 15, unit: '°C' })
      expect(sample['xref']['flash_point']['value']).to eq(15)
      expect(sample['xref']['flash_point']['unit']).to eq('°C')
    end

    it 'update sample molarity attribute with expected values' do
      importer.handle_sample_fields(sample, 'molarity', { value: 1.24, unit: 'M' })
      expect(sample['molarity_value']).to eq(1.24)
      expect(sample['molarity_unit']).to eq('M')
    end

    it 'update sample default attribute with expected values' do
      importer.handle_sample_fields(sample, 'refractive_index', 0.85)
      expect(sample['xref']['refractive_index']).to eq(0.85)
    end

    it 'update sample density attribute with expected values' do
      importer.handle_sample_fields(sample, 'density', { value: 2.24, unit: 'g/mL' })
      expect(sample['density']).to eq(2.24)
    end
  end

  describe '#get_data_from_molfile' do
    context 'when the molfile has a PolymersList block' do
      let(:polymer_molfile) { "some ctab\n> <PolymersList>\ndata" }
      let(:resolved_molecule) { create(:molecule) }
      let(:resolver_result) do
        Import::PolymerMoleculeResolver::Result.new(
          molecule: resolved_molecule, raw_molfile: polymer_molfile, babel_info: {},
        )
      end

      it 'delegates to Import::PolymerMoleculeResolver and adapts its Result into a [molecule, raw_molfile] tuple' do
        allow(Import::PolymerMoleculeResolver).to receive(:call).and_return(resolver_result)

        molecule, raw_molfile = importer.get_data_from_molfile({ 'molfile' => polymer_molfile })

        expect(Import::PolymerMoleculeResolver).to have_received(:call)
          .with(polymer_molfile, defer_pubchem_lookup: importer.instance_variable_get(:@defer_pubchem_lookup))
        expect(molecule).to eq(resolved_molecule)
        expect(raw_molfile).to eq(polymer_molfile)
      end
    end

    context 'when the PolymersList block is empty' do
      # Ketcher emits an empty "> <PolymersList>" block for structures with no polymer at all.
      # Those must take the ordinary molecule path -- routing them through the resolver gives every
      # such row a synthetic POLYMER_<sha> inchikey. The following "> <TextNode>" block is the
      # regression case: it must not be read as PolymersList payload.
      let(:empty_polymer_molfile) do
        "some ctab\nM  END\n> <PolymersList>\n> <TextNode>\n0#0ce7f3#t_95_0#label\n> </TextNode>\n$$$$\n"
      end

      it 'does not delegate to Import::PolymerMoleculeResolver' do
        allow(Import::PolymerMoleculeResolver).to receive(:call)
        allow(Chemotion::OpenBabelService).to receive(:molecule_info_from_molfile).and_return({ inchikey: nil })

        importer.get_data_from_molfile({ 'molfile' => empty_polymer_molfile })

        expect(Import::PolymerMoleculeResolver).not_to have_received(:call)
      end
    end
  end

  describe '#assign_molecule_data' do
    let(:babel_info) do
      { inchikey: 'PARTIALMOL-UHFFFAOYSA-N', is_partial: true, formula: 'C7H8',
        mol_wt: 92.1384, mass: 92.0626, molfile: "partial\n", molfile_version: 'V2000' }
    end

    before { allow(PubchemLookupJob).to receive(:perform_later) }

    it 'returns [nil, molfile, true] when the inchikey is blank' do
      expect(importer.send(:assign_molecule_data, 'molfile', {}, '', {}, 0))
        .to eq([nil, 'molfile', true])
    end

    # get_data_from_smiles resolves the inchikey from the SMILES when babel_info's own is
    # blank. Dropping it on the floor would make find_or_create_by_molfile re-derive
    # babel_info and return nil if that second attempt is blank too, silently losing the row.
    it 'uses the caller-resolved inchikey when babel_info has none' do
      resolved = 'RESOLVEDKEY-UHFFFAOYSA-N'
      info = babel_info.merge(inchikey: nil)

      molecule, = importer.send(:assign_molecule_data, "molfile\n", info, resolved, {}, 0)

      expect(molecule).to be_present
      expect(molecule.inchikey).to eq(resolved)
    end

    # An R-group structure must be stored under the same tuple it was looked up by, or the
    # next import misses it and inserts a duplicate the finder can never see again.
    it 'stores a partial molecule under the is_partial/stripped-formula tuple it was found by' do
      molecule, = importer.send(:assign_molecule_data, "molfile\n", babel_info,
                                babel_info[:inchikey], {}, 0)

      expect(molecule.is_partial).to be true
      expect(molecule.sum_formular).to eq(SumFormula.new('C7H8').remove_fragment('CH3').valid.to_s)
      expect(Molecule.find_by(inchikey: babel_info[:inchikey], is_partial: molecule.is_partial,
                              sum_formular: molecule.sum_formular)).to eq(molecule)
    end

    it 'reuses that row on a second import of the same structure instead of duplicating it' do
      first, = importer.send(:assign_molecule_data, "molfile\n", babel_info, babel_info[:inchikey], {}, 0)

      expect do
        second, = importer.send(:assign_molecule_data, "molfile\n", babel_info, babel_info[:inchikey], {}, 0)
        expect(second.id).to eq(first.id)
      end.not_to change(Molecule, :count)
    end
  end
end
