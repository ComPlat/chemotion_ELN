# frozen_string_literal: true

require 'rails_helper'

# rubocop:disable RSpec/NestedGroups
describe Chemotion::MoleculeAPI do
  context 'authorized user logged in' do
    let(:user) { create(:person) }

    before do
      allow_any_instance_of(WardenAuthentication).to(
        receive(:current_user).and_return(user),
      )
    end

    describe 'POST /api/v1/molecules' do
      let(:molfiles) do
        [
          build(:molfile, type: :pt_complex_wo_val),
          build(:molfile, type: :pt_complex_w_val),
          build(:molfile, type: :al_complex_wo_val),
          build(:molfile, type: :al_complex_w_val),
        ]
      end

      it 'is able to find or create a molecule by molfile' do
        allow(PubChem).to receive_messages(
          get_record_from_inchikey: nil,
          get_molfile_by_smiles: nil,
        )
        molecule_ids = molfiles.map do |molfile|
          post '/api/v1/molecules', params: { molfile: molfile, decoupled: false }
          JSON.parse(response.body)&.dig('id')
        end.uniq
        expect(molecule_ids.size).to eq(molfiles.size)
      end

      context 'with valid parameters' do
        let(:molfile) { build(:molfile, type: :cubane) }
        let(:attributes) { build(:attributes_set, from: 'structures/cubane')['cubane'] }

        it 'is able to find or create a molecule by molfile' do
          raise 'attributes not found' if attributes[:iupac_name].blank?

          # check that the molecule is not already in the database
          expect(Molecule.find_by(iupac_name: attributes[:iupac_name])).to be_nil
          post '/api/v1/molecules', params: { molfile: molfile, decoupled: false }
          expect(response).to have_http_status(201)
          expect(JSON.parse(response.body)).to include(
            {
              'inchistring' => attributes[:inchistring],
              'inchikey' => attributes[:inchikey],
              'cano_smiles' => attributes[:cano_smiles],
              'sum_formular' => attributes[:sum_formular],
              'molecular_weight' => satisfy do |mw|
                mw.is_a?(Float) && mw.round(5) == attributes[:molecular_weight].round(5)
              end,
              # "molecule_svg_file" => satisfy { |svg| svg =~ /\w{128}\.svg/ },
              'molfile' => satisfy { |molfile| molfile.start_with?(molfile[0..100]) },
            },
          )
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
        get "/api/v1/molecules/names?inchikey=#{m.inchikey}"
        mns = JSON.parse(response.body)['molecules'].map { |m| m['label'] }
        expect(mns).to include(m.sum_formular)
      end
    end

    describe 'Post /api/v1/molecules/smiles' do
      let(:bad_smiles) { build(:smiles_set, from: :bad_smiles) }
      let(:pc_smiles) { build(:smiles_set, from: :pc400) } # rubocop:disable
      let(:problematic) { build(:attributes_set, from: 'structures/problematic') }
      let(:wrong_molecule) do
        attributes = problematic['wrong'].slice(*Molecule.attribute_names.map(&:to_sym))
        create(:molecule, force_attributes: attributes)
      end

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

      context 'when a molecule with a corrupt molfile is already present', skip: 'present for reproducibility' do
        it 'cannot creates the correct molecule if one with corrupt molfile is there' do
          wrong_molecule_id = wrong_molecule.id
          wrong_smiles = problematic['wrong'][:smiles]
          post '/api/v1/molecules/smiles', params: { smiles: wrong_smiles }
          response_body = JSON.parse(response.body)
          # should have created a new molecule
          expect(response_body).to include('id' => satisfy { |id| id != wrong_molecule_id })
        end
      end
    end
  end
end
# rubocop:enable RSpec/NestedGroups
