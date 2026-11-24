# frozen_string_literal: true

# rubocop:disable RSpec/AnyInstance
require 'rails_helper'

describe Chemotion::MoleculeAPI do
  include_context 'api request authorization context'

  describe 'POST /api/v1/molecules' do
    let(:molfile) { "\n  Ketcher   0\n\n  0  0  0  0  0  0  0  0  0  0  0 V2000\nM  END\n" }
    let(:svg_string) { '<svg xmlns="http://www.w3.org/2000/svg"><g></g></svg>' }
    let(:svg_file_name) { 'processed_molecule.svg' }
    let(:molecule) { create(:molecule) }
    let(:dummy_molecule) { create(:molecule, inchikey: 'DUMMY-INCHIKEY-NA') }
    let(:svg_processor_result) { { svg_file_name: svg_file_name } }

    before do
      # enrich_and_schedule_pubchem is a Grape helpers method; stub its two underlying calls
      allow_any_instance_of(Molecule).to receive(:enrich_from_pubchem).and_return(nil)
      allow(Molecule).to receive(:schedule_pubchem_lookup_for).and_return(nil)
      allow(SVG::Processor).to receive(:new).and_return(
        instance_double(SVG::Processor, structure_svg: svg_processor_result),
      )
    end

    context 'with a normal V2000 molfile' do
      before do
        allow(Molecule).to receive(:find_or_create_by_molfile)
          .with(molfile, defer_pubchem_lookup: true)
          .and_return(molecule)
        allow(Molecule).to receive(:find_or_create_dummy).and_return(dummy_molecule)
        allow(Molecule).to receive(:svg_reprocess).with(nil, molfile).and_return(svg_string)

        post '/api/v1/molecules', params: { molfile: molfile }
      end

      it 'returns 201' do
        expect(response).to have_http_status(:created)
      end

      it 'includes molecule attributes in the response' do
        expect(parsed_json_response['inchikey']).to eq(molecule.inchikey)
        expect(parsed_json_response['molecular_weight']).to eq(molecule.molecular_weight)
        expect(parsed_json_response['sum_formular']).to eq(molecule.sum_formular)
      end

      it 'includes temp_svg in the response' do
        expect(parsed_json_response['temp_svg']).to eq(svg_file_name)
      end

      it 'does not call find_or_create_dummy' do
        expect(Molecule).not_to have_received(:find_or_create_dummy)
      end
    end

    context 'with decoupled: true' do
      before do
        allow(Molecule).to receive(:find_or_create_by_molfile).and_return(molecule)
        allow(Molecule).to receive(:find_or_create_dummy).and_return(dummy_molecule)
        allow(Molecule).to receive(:svg_reprocess).with(nil, molfile).and_return(svg_string)

        post '/api/v1/molecules', params: { molfile: molfile, decoupled: true }
      end

      it 'returns 201' do
        expect(response).to have_http_status(:created)
      end

      it 'calls find_or_create_dummy instead of find_or_create_by_molfile' do
        expect(Molecule).to have_received(:find_or_create_dummy).at_least(:once)
        expect(Molecule).not_to have_received(:find_or_create_by_molfile)
      end
    end

    context 'when find_or_create_by_molfile returns nil' do
      before do
        allow(Molecule).to receive(:find_or_create_by_molfile)
          .with(molfile, defer_pubchem_lookup: true)
          .and_return(nil)
        allow(Molecule).to receive(:find_or_create_dummy).and_return(dummy_molecule)
        allow(Molecule).to receive(:svg_reprocess).with(nil, molfile).and_return(svg_string)

        post '/api/v1/molecules', params: { molfile: molfile }
      end

      it 'returns 201 (falls back to dummy molecule)' do
        expect(response).to have_http_status(:created)
      end

      it 'falls back to find_or_create_dummy' do
        expect(Molecule).to have_received(:find_or_create_dummy)
      end
    end

    context 'when svg_reprocess returns blank' do
      before do
        allow(Molecule).to receive(:find_or_create_by_molfile)
          .with(molfile, defer_pubchem_lookup: true)
          .and_return(molecule)
        allow(Molecule).to receive(:svg_reprocess).with(nil, molfile).and_return(nil)

        post '/api/v1/molecules', params: { molfile: molfile }
      end

      it 'returns 422' do
        expect(response).to have_http_status(:unprocessable_entity)
      end

      it 'returns an error message' do
        expect(parsed_json_response['error']).to eq('Failed to generate SVG from molfile')
      end
    end

    context 'when svg_file contains "epam-ketcher-ssc"' do
      let(:epam_svg) { '<svg xmlns="http://www.w3.org/2000/svg" data-editor="epam-ketcher-ssc"><g></g></svg>' }
      let(:cleaned_svg) { '<svg xmlns="http://www.w3.org/2000/svg"><g></g></svg>' }

      before do
        allow(Molecule).to receive(:find_or_create_by_molfile)
          .with(molfile, defer_pubchem_lookup: true)
          .and_return(molecule)
        allow(Molecule).to receive(:svg_reprocess)
        allow(KetcherService::SVGProcessor).to receive(:clean_and_trim_svg)
          .with(epam_svg)
          .and_return(cleaned_svg)

        post '/api/v1/molecules', params: { molfile: molfile, svg_file: epam_svg }
      end

      it 'returns 201' do
        expect(response).to have_http_status(:created)
      end

      it 'processes SVG via KetcherService::SVGProcessor instead of svg_reprocess' do
        expect(KetcherService::SVGProcessor).to have_received(:clean_and_trim_svg).with(epam_svg)
        expect(Molecule).not_to have_received(:svg_reprocess)
      end

      it 'includes temp_svg in the response' do
        expect(parsed_json_response['temp_svg']).to eq(svg_file_name)
      end
    end
  end
end
