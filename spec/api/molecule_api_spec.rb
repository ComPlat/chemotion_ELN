# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::MoleculeAPI do
  context 'authorized user logged in' do
    let(:user) { create(:person) }

    before do
      allow_any_instance_of(WardenAuthentication).to(
        receive(:current_user).and_return(user),
      )
    end

    describe 'POST /api/v1/molecules' do
      context 'with valid parameters' do
        let!(:molfile) do
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

        let!(:params) do
          {
            inchistring: 'InChI=1S/C8H8/c1-2-5-3(1)7-4(1)6(2)8(5)7/h1-8H',
            # molecule_svg_file: "TXWRERCHRDBNLG-UHFFFAOYSA-N.svg",
            inchikey: 'TXWRERCHRDBNLG-UHFFFAOYSA-N',
            molecular_weight: 104.14912,
            sum_formular: 'C8H8',
            iupac_name: 'cubane',
            names: ['cubane'],
          }
        end
        let!(:decoupled) { false }

        it 'is able to find or create a molecule by molfile' do
          m = Molecule.find_by(molfile: molfile)
          expect(m).to be_nil
          post '/api/v1/molecules', params: { molfile: molfile, decoupled: false }
          m = Molecule.find_by(molfile: molfile)
          expect(m).not_to be_nil
          mw = params.delete(:molecular_weight)
          expect(m.attributes['molecular_weight'].round(5)).to eq(mw)
          params.each do |k, v|
            expect(m.attributes.symbolize_keys[k]).to eq(v) unless m.attributes.symbolize_keys[k].is_a?(Float)
            if m.attributes.symbolize_keys[k].is_a?(Float)
              expect(m.attributes.symbolize_keys[k].round(5)).to eq(v.round(5))
            end
          end
          expect(m.molecule_svg_file).to match(/\w{128}\.svg/)
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
      let(:m) { create(:molecule) }

      it 'returns molecule_names hash' do
        get "/api/v1/molecules/names?id=#{m.id}"
        mns = JSON.parse(response.body)['molecules'].map { |m| m['label'] }
        expect(mns).to include(m.sum_formular)
      end
    end

    describe 'Post /api/v1/molecules/smiles' do
      let(:bad_smiles) { build(:smiles_set, from: :bad_smiles) }
      let(:pc_smiles) { build(:smiles_set, from: :pc400) } # rubocop:disable

      before do
        allow(PubChem).to receive_messages(
          get_record_from_inchikey: nil,
          get_molfile_by_smiles: nil,
        )
      end

      it 'handles SMILES correctly and returns molecule' do
        (bad_smiles + pc_smiles).each do |smiles|
          post '/api/v1/molecules/smiles', params: { smiles: smiles }
          puts smiles
          response_body = JSON.parse(response.body)
          expect(response_body).to include('molfile' => satisfy { |molfile|
            molfile.present? && !molfile.start_with?('Status: 400')
          })
        end
      end
    end
  end
end
