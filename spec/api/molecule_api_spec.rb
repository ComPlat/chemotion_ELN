# frozen_string_literal: true

require 'rails_helper'

# rubocop:disable RSpec/NestedGroups
describe Chemotion::MoleculeAPI do
  context 'authorized user logged in' do
    let(:user) { create(:person) }
    let(:warden_instance) { instance_double(WardenAuthentication, current_user: user) }

    before do
      allow(WardenAuthentication).to receive(:new).and_return(warden_instance)
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
        get "/api/v1/molecules/names?id=#{m.id}"
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

    describe 'POST /api/v1/molecules/reaction-svg-refresh-batch' do
      def molfile1
        @molfile1 ||= build(:molfile, type: :water)
      end

      def molfile2
        @molfile2 ||= build(:molfile, type: :cubane)
      end

      def svg_filename1
        @svg_filename1 ||= "batch_refresh_svg_spec_1_#{SecureRandom.hex(8)}.svg"
      end

      def svg_filename2
        @svg_filename2 ||= "batch_refresh_svg_spec_2_#{SecureRandom.hex(8)}.svg"
      end

      def svg_path1
        "/images/samples/#{svg_filename1}"
      end

      def svg_path2
        "/images/samples/#{svg_filename2}"
      end

      def target_path1
        Rails.public_path.join('images', 'samples', svg_filename1)
      end

      def target_path2
        Rails.public_path.join('images', 'samples', svg_filename2)
      end

      def post_refresh_svg_batch(svgs)
        post '/api/v1/molecules/reaction-svg-refresh-batch',
             params: { svgs: svgs }.to_json,
             headers: { 'Content-Type' => 'application/json' }
      end

      after do
        FileUtils.rm_f(target_path1) if target_path1 && File.exist?(target_path1)
        FileUtils.rm_f(target_path2) if target_path2 && File.exist?(target_path2)
      end

      context 'when svgs array is empty' do
        it 'returns 400' do
          post_refresh_svg_batch([])
          expect(response).to have_http_status(400)
          expect(JSON.parse(response.body)).to eq('svgs array is required and cannot be empty.')
        end
      end

      context 'when parameters are missing' do
        it 'returns results with success: false for missing molfile', :aggregate_failures do
          svgs = [{ svg_path: svg_path1, molfile: '' }]
          post_refresh_svg_batch(svgs)
          expect(response).to have_http_status(200)
          results = JSON.parse(response.body)['results']
          expect(results.length).to eq(1)
          expect(results[0]['success']).to be false
          expect(results[0]['error']).to eq('molfile and svg_path are required.')
        end

        it 'returns results with success: false for missing svg_path', :aggregate_failures do
          svgs = [{ svg_path: '', molfile: molfile1 }]
          post_refresh_svg_batch(svgs)
          expect(response).to have_http_status(200)
          results = JSON.parse(response.body)['results']
          expect(results.length).to eq(1)
          expect(results[0]['success']).to be false
          expect(results[0]['error']).to eq('molfile and svg_path are required.')
        end

        it 'handles string keys in params' do
          svgs = [{ 'svg_path' => svg_path1, 'molfile' => molfile1 }]
          post_refresh_svg_batch(svgs)
          expect(response).to have_http_status(200)
          results = JSON.parse(response.body)['results']
          expect(results.length).to eq(1)
          # Should process successfully if mocked
        end
      end

      context 'when filename is invalid (path traversal)' do
        def mock_svg_temp
          @mock_svg_temp ||= Tempfile.create(['spec_batch_invalid_fn', '.svg'])
        end

        def mock_svg_path
          mock_svg_temp.path
        end

        before do
          File.write(mock_svg_path, '<svg/>')
          molecule = instance_double(Molecule, inchikey: 'XLYOFNOQVPJJNP-UHFFFAOYSA-N')
          allow(Molecule).to receive_messages(
            find_or_create_by_molfile: molecule,
            svg_reprocess: '<svg/>',
          )
          processor_instance = instance_double(SVG::Processor)
          allow(SVG::Processor).to receive(:new).and_return(processor_instance)
          allow(processor_instance).to receive(:structure_svg)
            .and_return({ svg_file_path: mock_svg_path, svg_file_name: File.basename(mock_svg_path) })
        end

        after do
          mock_svg_temp&.close
          FileUtils.rm_f(mock_svg_path) if mock_svg_path && File.exist?(mock_svg_path)
        end

        it 'returns success: false for invalid filenames', :aggregate_failures do
          svgs = [
            { svg_path: '/images/samples/sub/..', molfile: molfile1 },
            { svg_path: 'folder\\name.svg', molfile: molfile2 },
          ]
          post_refresh_svg_batch(svgs)
          expect(response).to have_http_status(200)
          results = JSON.parse(response.body)['results']
          expect(results.length).to eq(2)
          expect(results[0]['success']).to be false
          expect(results[0]['error']).to eq('Invalid filename')
          expect(results[1]['success']).to be false
          expect(results[1]['error']).to eq('Invalid filename')
        end
      end

      context 'when molecule creation or SVG generation fails' do
        it 'returns success: false when Molecule.find_or_create_by_molfile fails', :aggregate_failures do
          allow(Molecule).to receive_messages(
            find_or_create_by_molfile: nil,
            find_or_create_dummy: nil,
          )

          svgs = [{ svg_path: svg_path1, molfile: molfile1 }]
          post_refresh_svg_batch(svgs)
          expect(response).to have_http_status(200)
          results = JSON.parse(response.body)['results']
          expect(results.length).to eq(1)
          expect(results[0]['success']).to be false
          expect(results[0]['error']).to eq('Failed to create molecule from molfile')
        end

        it 'returns success: false when Molecule.svg_reprocess returns blank', :aggregate_failures do
          molecule = instance_double(Molecule, inchikey: 'XLYOFNOQVPJJNP-UHFFFAOYSA-N')
          allow(Molecule).to receive_messages(
            find_or_create_by_molfile: molecule,
            svg_reprocess: nil,
          )

          svgs = [{ svg_path: svg_path1, molfile: molfile1 }]
          post_refresh_svg_batch(svgs)
          expect(response).to have_http_status(200)
          results = JSON.parse(response.body)['results']
          expect(results.length).to eq(1)
          expect(results[0]['success']).to be false
          expect(results[0]['error']).to eq('Failed to generate SVG from molfile')
        end

        it 'returns success: false when SVG::Processor does not produce a valid file', :aggregate_failures do
          molecule = instance_double(Molecule, inchikey: 'XLYOFNOQVPJJNP-UHFFFAOYSA-N')
          allow(Molecule).to receive_messages(
            find_or_create_by_molfile: molecule,
            svg_reprocess: '<svg></svg>',
          )
          processor_instance = instance_double(SVG::Processor)
          allow(SVG::Processor).to receive(:new).and_return(processor_instance)
          allow(processor_instance).to receive(:structure_svg)
            .and_return({ svg_file_path: '/nonexistent/path.svg', svg_file_name: 'path.svg' })

          svgs = [{ svg_path: svg_path1, molfile: molfile1 }]
          post_refresh_svg_batch(svgs)
          expect(response).to have_http_status(200)
          results = JSON.parse(response.body)['results']
          expect(results.length).to eq(1)
          expect(results[0]['success']).to be false
          expect(results[0]['error']).to eq('Failed to generate SVG.')
        end
      end

      context 'with valid parameters and mocked services' do
        def mock_svg_content
          '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
        end

        def mock_svg_temp1
          @mock_svg_temp1 ||= Tempfile.create(['spec_batch_refresh_svg_1', '.svg'])
        end

        def mock_svg_temp2
          @mock_svg_temp2 ||= Tempfile.create(['spec_batch_refresh_svg_2', '.svg'])
        end

        def mock_svg_path1
          mock_svg_temp1.path
        end

        def mock_svg_path2
          mock_svg_temp2.path
        end

        before do
          File.write(mock_svg_path1, mock_svg_content)
          File.write(mock_svg_path2, mock_svg_content)
          molecule1 = instance_double(Molecule, inchikey: 'XLYOFNOQVPJJNP-UHFFFAOYSA-N')
          molecule2 = instance_double(Molecule, inchikey: 'ABC123DEF456-GHI789JKL012')
          allow(Molecule).to receive(:find_or_create_by_molfile).with(molfile1).and_return(molecule1)
          allow(Molecule).to receive(:find_or_create_by_molfile).with(molfile2).and_return(molecule2)
          allow(Molecule).to receive(:svg_reprocess).with(nil, molfile1).and_return(mock_svg_content)
          allow(Molecule).to receive(:svg_reprocess).with(nil, molfile2).and_return(mock_svg_content)
          processor_instance = instance_double(SVG::Processor)
          allow(SVG::Processor).to receive(:new).and_return(processor_instance)
          allow(processor_instance).to receive(:structure_svg) do |_editor, _svg, _digest, _centered|
            # Return different paths based on digest or use a round-robin approach
            # For simplicity, we'll use the first path for both since they're identical content
            { svg_file_path: mock_svg_path1, svg_file_name: File.basename(mock_svg_path1) }
          end
        end

        after do
          mock_svg_temp1&.close
          mock_svg_temp2&.close
          FileUtils.rm_f(mock_svg_path1) if mock_svg_path1 && File.exist?(mock_svg_path1)
          FileUtils.rm_f(mock_svg_path2) if mock_svg_path2 && File.exist?(mock_svg_path2)
        end

        it 'returns 200 with results array containing success: true for valid SVGs', :aggregate_failures do
          svgs = [
            { svg_path: svg_path1, molfile: molfile1 },
            { svg_path: svg_path2, molfile: molfile2 },
          ]
          post_refresh_svg_batch(svgs)
          expect(response).to have_http_status(200)
          results = JSON.parse(response.body)['results']
          expect(results.length).to eq(2)
          expect(results[0]['success']).to be true
          expect(results[0]['filename']).to eq(svg_filename1)
          expect(results[1]['success']).to be true
          expect(results[1]['filename']).to eq(svg_filename2)
          expect(File).to exist(target_path1)
          expect(File).to exist(target_path2)
        end

        it 'handles partial failures correctly', :aggregate_failures do
          # First SVG will succeed, second will fail
          allow(Molecule).to receive(:find_or_create_by_molfile).with(molfile2).and_return(nil)
          allow(Molecule).to receive(:find_or_create_dummy).and_return(nil)

          svgs = [
            { svg_path: svg_path1, molfile: molfile1 },
            { svg_path: svg_path2, molfile: molfile2 },
          ]
          post_refresh_svg_batch(svgs)
          expect(response).to have_http_status(200)
          results = JSON.parse(response.body)['results']
          expect(results.length).to eq(2)
          expect(results[0]['success']).to be true
          expect(results[0]['filename']).to eq(svg_filename1)
          expect(results[1]['success']).to be false
          expect(results[1]['error']).to eq('Failed to create molecule from molfile')
          expect(File).to exist(target_path1)
        end

        it 'handles single SVG correctly', :aggregate_failures do
          svgs = [{ svg_path: svg_path1, molfile: molfile1 }]
          post_refresh_svg_batch(svgs)
          expect(response).to have_http_status(200)
          results = JSON.parse(response.body)['results']
          expect(results.length).to eq(1)
          expect(results[0]['success']).to be true
          expect(results[0]['filename']).to eq(svg_filename1)
        end
      end
    end
  end
end
# rubocop:enable RSpec/NestedGroups
