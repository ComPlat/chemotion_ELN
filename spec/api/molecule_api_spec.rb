# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::MoleculeAPI do
  context 'authorized user logged in' do
    let(:user) { create(:person) }

    before do
      allow_any_instance_of(WardenAuthentication).to(
        receive(:current_user).and_return(user)
      )
    end

    describe 'POST /api/v1/molecules' do
      let(:molfile) do
        "
        Ketcher 09231514282D 1   1.00000     0.00000     0

          8 12  0     0  0            999 V2000
          -4.3500    1.8250    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
          -1.8750    2.5000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
          -1.3500    0.3750    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
            1.3250    1.3750    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
          -1.6000   -0.2000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
          -4.1500   -1.0250    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
          -1.0000   -2.6500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
            1.5250   -1.5250    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
          1  3  1  0     0  0
          1  2  1  0     0  0
          2  4  1  0     0  0
          4  3  1  0     0  0
          3  7  1  0     0  0
          6  7  1  0     0  0
          6  1  1  0     0  0
          6  5  1  0     0  0
          5  2  1  0     0  0
          5  8  1  0     0  0
          8  4  1  0     0  0
          8  7  1  0     0  0
        M  END"
      end
      let(:svg_file) { 'TXWRERCHRDBNLG-UHFFFAOYSA-N.svg' }
      let(:editor) { 'openbabel' }
      let(:valid_params) do
        {
          molfile: molfile,
          svg_file: svg_file,
          editor: editor,
          decoupled: false,
        }
      end

      context 'with valid parameters' do
        it 'returns the molecule entity with expected attributes' do
          post '/api/v1/molecules', params: valid_params
          expect(response).to have_http_status(:created)
          molecule = JSON.parse(response.body)
          expect(molecule['molfile']).to eq(molfile)
        end
      end

      context 'with decoupled true' do
        let(:decoupled) { true }

        it 'creates a dummy molecule' do
          post '/api/v1/molecules', params: valid_params

          expect(response).to have_http_status(:created)
          molecule = JSON.parse(response.body)
          expect(molecule['inchikey']).to eq('DUMMY')
        end
      end

      context 'with missing SVG file' do
        it 'processes and generates SVG from the molfile' do
          post '/api/v1/molecules', params: valid_params.except(:svg_file)

          expect(response).to have_http_status(:created)
          molecule = JSON.parse(response.body)
          expect(molecule).to include('temp_svg')
        end
      end
    end

    describe 'Get /api/v1/molecules/cas' do
      let!(:m) { create(:molecule) }

      skip 'returns a molecule with CAS number' do
        expect(m.cas).to eq([])

        get "/api/v1/molecules/cas?inchikey=#{m.inchikey}"
        expect(JSON.parse(response.body)['cas'])
          .to eq ['110-86-1']
      end
    end

    describe 'Get /api/v1/molecules/names' do
      let!(:m) { create(:molecule) }
      let!(:nn) { 'this_is_a_new_name' }

      it 'returns molecule_names hash' do
        get "/api/v1/molecules/names?inchikey=#{m.inchikey}"
        mns = JSON.parse(response.body)['molecules'].map { |m| m['label'] }
        expect(mns).to include(m.sum_formular)
      end
    end
  end
end
