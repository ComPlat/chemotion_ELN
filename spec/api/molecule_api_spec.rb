# frozen_string_literal: true

require 'rails_helper'
require 'cgi'

# rubocop:disable RSpec/NestedGroups
describe Chemotion::MoleculeAPI do
  context 'authorized user logged in' do
    let(:user) { create(:person) }

    before do
      allow_any_instance_of(WardenAuthentication).to(
        receive(:current_user).and_return(user),
      )
    end

    describe 'POST /api/v1/molecules — inline PubChem enrichment' do
      let(:molfile) { build(:molfile, type: :cubane) }

      def post_molecule
        post '/api/v1/molecules', params: { molfile: molfile, decoupled: false }
      end

      it 'enriches the molecule before responding, so the name is there immediately' do
        # molecule_info_and_outcome_from_inchikey, not molecule_info_from_inchikey: the latter
        # delegates *to* it, so stubbing it is inert and the example would pass on the WebMock
        # fixture alone, catching no regression in the outcome plumbing.
        allow(Chemotion::PubchemService).to receive(:molecule_info_and_outcome_from_inchikey)
          .and_return([{ cid: 962, iupac_name: 'cubane', names: %w[cubane] }, :ok])

        post_molecule

        expect(response).to have_http_status(:created)
        body = JSON.parse(response.body)
        expect(body['iupac_name']).to eq('cubane')
        expect(body['names']).to eq(%w[cubane])
      end

      it 'bounds the lookup so a slow PubChem cannot hold the request open' do
        allow(PubChem).to receive(:fetch_record_from_inchikey).and_call_original

        post_molecule

        expect(PubChem).to have_received(:fetch_record_from_inchikey)
          .with(anything, timeout: Chemotion::MoleculeAPI::SYNC_ENRICH_TIMEOUT)
      end

      # A timeout must degrade to exactly what the deferral already does: nothing written, and
      # the PubchemLookupJob queued by after_create_commit left to do the work.
      #
      # :unavailable, which is what a timeout actually produces — not :not_found. The
      # distinction matters to the last assertion: :not_found *does* write pubchem_checked_at,
      # so stubbing it here would have made the example claim to test the timeout path while
      # exercising the miss path, and would have let a regression that remembered transient
      # failures pass unnoticed.
      it 'writes nothing when the lookup times out', :aggregate_failures do
        allow(PubChem).to receive(:fetch_record_from_inchikey).and_return([nil, :unavailable])

        # A molecule create always makes its own sum_formular MoleculeName; what must not
        # appear is an iupac_name row, which only enrichment writes.
        expect { post_molecule }
          .not_to change { MoleculeName.where(description: 'iupac_name').count }.from(0)

        expect(response).to have_http_status(:created)
        molecule = Molecule.find(JSON.parse(response.body)['id'])
        expect(molecule.iupac_name).to be_nil
        expect(molecule.names).to eq([])
        expect(molecule.tag.taggable_data['pubchem_cid']).to be_nil
        # The molecule must stay enrichable: we never got an answer, so there is nothing to
        # remember, and the queued job has to be free to try again.
        expect(molecule.tag.taggable_data['pubchem_checked_at']).to be_nil
      end

      it 'does not query PubChem for a decoupled (dummy) molecule' do
        allow(PubChem).to receive(:fetch_record_from_inchikey)

        post '/api/v1/molecules', params: { molfile: molfile, decoupled: true }

        expect(PubChem).not_to have_received(:fetch_record_from_inchikey)
      end

      # PubChem holds no record for in-house compounds, so nothing is ever written and
      # pubchem_check stays false. Without the previously_new_record? gate every later save of
      # the same structure would fire another inline lookup, outside the rate-limit guard.
      it 'does not re-query PubChem for a structure it already looked up and did not find' do
        allow(PubChem).to receive(:fetch_record_from_inchikey).and_return([nil, :not_found])
        post_molecule
        expect(PubChem).to have_received(:fetch_record_from_inchikey).once

        post_molecule

        expect(PubChem).to have_received(:fetch_record_from_inchikey).once
      end

      it 'does not re-query PubChem for a molecule that already has a cid' do
        allow(Chemotion::PubchemService).to receive(:molecule_info_and_outcome_from_inchikey)
          .and_return([{ cid: 962, iupac_name: 'cubane', names: %w[cubane] }, :ok])
        post_molecule
        allow(PubChem).to receive(:fetch_record_from_inchikey)

        post_molecule

        expect(PubChem).not_to have_received(:fetch_record_from_inchikey)
      end

      # The endpoints pass defer_pubchem_lookup: true and schedule explicitly afterwards. Left
      # to Molecule's after_create_commit, the job is enqueued at commit — before the inline
      # attempt runs — so a worker can reserve it and ask PubChem the same question
      # concurrently.
      context 'when scheduling the follow-up job' do
        it 'schedules exactly one, not one from the callback and one from the endpoint' do
          allow(PubchemLookupJob).to receive(:perform_later)

          post_molecule

          expect(PubchemLookupJob).to have_received(:perform_later).once
        end

        # The job is still wanted after a successful inline lookup: enrich_from_pubchem never
        # fetches LCSS, so the GHS half is what remains for it to do.
        it 'schedules even when the inline enrichment succeeded' do
          allow(Chemotion::PubchemService).to receive(:molecule_info_and_outcome_from_inchikey)
            .and_return([{ cid: 962, iupac_name: 'cubane', names: %w[cubane] }, :ok])
          allow(PubchemLookupJob).to receive(:perform_later)

          post_molecule

          expect(PubchemLookupJob).to have_received(:perform_later).once
        end

        # A found molecule has been through this once already, when it was created.
        it 'does not schedule for a molecule that already existed' do
          post_molecule
          allow(PubchemLookupJob).to receive(:perform_later)

          post_molecule

          expect(PubchemLookupJob).not_to have_received(:perform_later)
        end

        # The ordering that motivates scheduling here rather than from the callback: by the
        # time the job is enqueued, the inline attempt has already written the cid, so
        # PubchemLookupJob#enrich_and_fetch_lcss deterministically skips the enrich half
        # instead of skipping it only if the worker happens to start late enough.
        it 'schedules only after the inline enrichment has written the cid' do
          cid_at_enqueue = nil
          allow(PubchemLookupJob).to receive(:perform_later) do |ids|
            cid_at_enqueue = Molecule.find(ids.first).tag.taggable_data['pubchem_cid']
          end

          post_molecule

          expect(cid_at_enqueue).to be_present
        end

        it 'does not schedule for a decoupled (dummy) molecule' do
          allow(PubchemLookupJob).to receive(:perform_later)

          post '/api/v1/molecules', params: { molfile: molfile, decoupled: true }

          expect(PubchemLookupJob).not_to have_received(:perform_later)
        end
      end
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
          fetch_record_from_inchikey: [nil, :not_found],
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

      context 'with Unicode characters in new_name' do
        it 'creates a molecule name with en dash (alloy notation)' do
          get "/api/v1/molecules/names?id=#{m.id}&new_name=#{CGI.escape('Cu–Ni')}"
          expect(response).to have_http_status(:ok)
          labels = JSON.parse(response.body)['molecules'].pluck('label')
          expect(labels).to include('Cu–Ni')
        end

        it 'creates a molecule name with middle dot (adduct notation)' do
          get "/api/v1/molecules/names?id=#{m.id}&new_name=#{CGI.escape('CuSO4·5H2O')}"
          expect(response).to have_http_status(:ok)
          labels = JSON.parse(response.body)['molecules'].pluck('label')
          expect(labels).to include('CuSO4·5H2O')
        end
      end
    end

    describe 'Post /api/v1/molecules/save_name' do
      let(:m) { create(:molecule) }

      before { allow(user).to receive(:molecule_editor).and_return(true) }

      it 'saves a molecule name with en dash' do
        post '/api/v1/molecules/save_name', params: {
          id: m.id, name_id: -1, name: 'Cu–Ni', description: 'defined by user'
        }
        expect(response).to have_http_status(:created)
        expect(JSON.parse(response.body)['name']).to eq('Cu–Ni')
      end

      it 'saves a molecule name with middle dot' do
        post '/api/v1/molecules/save_name', params: {
          id: m.id, name_id: -1, name: 'CuSO4·5H2O', description: 'defined by user'
        }
        expect(response).to have_http_status(:created)
        expect(JSON.parse(response.body)['name']).to eq('CuSO4·5H2O')
      end

      it 'rejects a name containing a bidi override character' do
        post '/api/v1/molecules/save_name', params: {
          id: m.id, name_id: -1, name: 'safe‮name', description: 'defined by user'
        }
        expect(response).to have_http_status(:created)
        body = JSON.parse(response.body)
        expect(body['name']).to be_nil
      end

      it 'rejects a name containing a zero-width space' do
        post '/api/v1/molecules/save_name', params: {
          id: m.id, name_id: -1, name: 'Cu​Ni', description: 'defined by user'
        }
        expect(response).to have_http_status(:created)
        body = JSON.parse(response.body)
        expect(body['name']).to be_nil
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
          fetch_record_from_inchikey: [nil, :not_found],
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

    describe 'POST /api/v1/molecules — PolymersList SVG generation' do
      let(:polymer_molfile) do
        <<~MOL
          null
            Ketcher  6232611422D 1   1.00000     0.00000     0

            1  0  0  0  0  0  0  0  0  0999 V2000
              2.0250   -2.0250    0.0000 R#   0  0  0  0  0  0  0  0  0  0  0  0
          M  END

          > <PolymersList>
          0/95/1.00-1.00
          $$$$
        MOL
      end
      let(:plain_molfile) { build(:molfile, type: :cubane) }
      # A plain SVG with no epam-ketcher-ssc marker — used with polymer_molfile
      let(:fake_svg) { '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="3"/></svg>' }
      # An SVG that triggers the Ketcher-EPAM path (svg.include?('epam-ketcher-ssc'))
      let(:epam_svg) { '<svg xmlns="http://www.w3.org/2000/svg" data-source="epam-ketcher-ssc"><circle/></svg>' }
      let(:polymer_svg) do
        '<svg xmlns="http://www.w3.org/2000/svg">' \
          '<image href="data:image/svg+xml;base64,ZmFrZQ==" width="10" height="10"/></svg>'
      end

      before do
        allow(PubChem).to receive_messages(
          fetch_record_from_inchikey: [nil, :not_found],
          get_molfile_by_smiles: nil,
        )
        allow(Molecule).to receive_messages(
          svg_reprocess: polymer_svg,
          find_or_create_by_molfile: create(:molecule),
          find_or_create_dummy: create(:molecule),
        )
        svg_processor = instance_double(
          SVG::Processor,
          structure_svg: { svg_file_name: "TMPFILE#{SecureRandom.hex(32)}.svg" },
        )
        allow(SVG::Processor).to receive(:new).and_return(svg_processor)
        allow(KetcherService::SVGProcessor).to receive(:clean_and_trim_svg).and_return(epam_svg)
      end

      it 'ignores frontend svg_file and calls svg_reprocess when molfile has PolymersList' do
        post '/api/v1/molecules', params: { molfile: polymer_molfile, svg_file: fake_svg }
        expect(response).to have_http_status(:success)
        expect(Molecule).to have_received(:svg_reprocess).with(nil, polymer_molfile, hash_including(service: 'indigo'))
      end

      it 'uses svg_reprocess even when no frontend svg_file sent with PolymersList molfile' do
        post '/api/v1/molecules', params: { molfile: polymer_molfile }
        expect(response).to have_http_status(:success)
        expect(Molecule).to have_received(:svg_reprocess)
      end

      it 'does NOT call svg_reprocess when frontend svg contains epam-ketcher-ssc marker' do
        post '/api/v1/molecules', params: { molfile: plain_molfile, svg_file: epam_svg }
        expect(response).to have_http_status(:success)
        expect(Molecule).not_to have_received(:svg_reprocess)
      end
    end
  end
end
# rubocop:enable RSpec/NestedGroups
