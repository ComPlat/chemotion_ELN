require 'rails_helper'

describe Chemotion::MoleculeAPI do

  context 'authorized user logged in' do
    let(:user)  { create(:person) }

    before do
      allow_any_instance_of(WardenAuthentication).to(
        receive(:current_user).and_return(user))
    end

    describe 'POST /api/v1/molecules' do
      context 'with valid parameters' do

        let!(:molfile) {
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
        }

        let!(:params) {
          {
            inchistring: "InChI=1S/C8H8/c1-2-5-3(1)7-4(1)6(2)8(5)7/h1-8H",
            #molecule_svg_file: "TXWRERCHRDBNLG-UHFFFAOYSA-N.svg",
            inchikey: "TXWRERCHRDBNLG-UHFFFAOYSA-N",
            molecular_weight: 104.14912,
            sum_formular: "C8H8",
            iupac_name: "cubane",
            names: ["cubane"],
          }
        }

        it 'should be able to find or create a molecule by molfile' do
          m = Molecule.find_by(molfile: molfile)
          expect(m).to be_nil
          post '/api/v1/molecules', { molfile: molfile }
          m = Molecule.find_by(molfile: molfile)
          expect(m).to_not be_nil
          params.each do |k, v|
            expect(m.attributes.symbolize_keys[k]).to eq(v)
          end
          expect(m.molecule_svg_file).to match(/\w{128}\.svg/)
        end

      end
    end


    describe 'Get /api/v1/molecules/cas' do
      let!(:m) { create(:molecule) }

      it 'returns a molecule with CAS number' do
        expect(m.cas).to eq([])

        get "/api/v1/molecules/cas?inchikey=#{m.inchikey}"
        expect(JSON.parse(response.body)["cas"])
          .to eq ["123-456-789", "987-654-321", "558440-22-5"]
      end
    end

    describe 'Get /api/v1/molecules/names' do
      let!(:m) { create(:molecule) }
      let!(:nn) { "this_is_a_new_name" }

      it 'returns molecule_names hash' do
        get "/api/v1/molecules/names?inchikey=#{m.inchikey}"
        mns = JSON.parse(response.body)["molecules"].map { |m| m["label"] }
        expect(mns).to include(m.sum_formular)
      end
    end
  end
end
