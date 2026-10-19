# frozen_string_literal: true

require 'rails_helper'

# rubocop:disable RSpec/MultipleMemoizedHelpers, RSpec/NestedGroups, RSpec/IndexedLet
describe Chemotion::ReportAPI do
  let(:user) { create(:user) }
  let!(:collection) { create(:collection, user_id: user.id) }
  let(:warden_authentication_instance) { instance_double(WardenAuthentication) }

  before do
    allow(WardenAuthentication).to receive(:new).and_return(warden_authentication_instance)
    allow(warden_authentication_instance).to receive(:current_user).and_return(user)
  end

  context 'with an authorized user logged in' do
    let(:other) { create(:user) }
    let(:docx_mime_type) do
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    end

    let(:excel_mime_type) { 'application/vnd.ms-excel' }
    let(:ext) { 'docx' }
    let!(:rp1) { create(:report, :downloadable, user: user, file_name: 'ELN_Report_1') }
    let!(:rp2) { create(:report, :undownloadable, user: user) }
    let!(:rp3) { create(:report, :downloadable, user: user) }

    let!(:rp_others) { create(:report, user: other) }
    let(:s1) { create(:sample, collections: [collection]) }
    let(:s2) { create(:sample, collections: [collection]) }
    let!(:r1) { create(:reaction, collections: [collection]) }
    let!(:r2) { create(:reaction, collections: [collection]) }

    describe 'GET /api/v1/reports/docx' do
      before do
        params = { id: r1.id.to_s }

        get '/api/v1/reports/docx', params: params
      end

      it 'returns a header with docx-type' do
        expect(response['Content-Type']).to eq(docx_mime_type)
        expect(response['Content-Disposition']).to include('.docx')
      end
    end

    describe 'GET /api/v1/reports/docx authorization' do
      let!(:foreign_collection) { create(:collection, user_id: other.id) }
      let!(:foreign_reaction) { create(:reaction, collections: [foreign_collection]) }

      it 'rejects a reaction the user may not read (no share / not owned)' do
        get '/api/v1/reports/docx', params: { id: foreign_reaction.id.to_s }

        expect(response).to have_http_status(:unauthorized)
      end

      it 'still serves a reaction the user owns' do
        get '/api/v1/reports/docx', params: { id: r1.id.to_s }

        expect(response).to have_http_status(:ok)
      end
    end

    describe 'POST /api/v1/reports authorization' do
      let!(:foreign_collection) { create(:collection, user_id: other.id) }
      let!(:foreign_reaction) { create(:reaction, collections: [foreign_collection]) }
      let(:report_params) do
        {
          objTags: [{ id: foreign_reaction.id, type: 'reaction' }],
          splSettings: [], rxnSettings: [], siRxnSettings: [], configs: [],
          molSerials: [], prdAtts: [], imgFormat: 'png',
          fileName: 'ELN', templateId: 'standard'
        }
      end

      it 'rejects objTags the user may not read and creates no report' do
        expect { post '/api/v1/reports', params: report_params, as: :json }
          .not_to change(Report, :count)

        expect(response).to have_http_status(:unauthorized)
      end
    end

    describe 'export_samples_from_selections as SDfiles' do
      let(:c) { create(:collection, user_id: user.id) }
      let(:molfiles) do
        [
          '../../mof_v2000_1.sdf',
          '../../mof_v2000_2.sdf',
          '../../mof_v2000_3.sdf',
          '../../mof_v3000_1.sdf',
        ].map do |src|
          build(:molfile, src: src)
        end
      end
      let(:samples) do
        [
          create(:sample, name: 'Sample 20001', molfile: molfiles[0], collections: [collection]),
          create(:sample, name: 'Sample 20002', molfile: molfiles[1], collections: [collection]),
          create(:sample, name: 'Sample 20002', molfile: molfiles[2], collections: [collection]),
          create(:sample, name: 'Sample 30001', molfile: molfiles[3], collections: [collection]),
        ]
      end
      let(:no_checked) do
        {
          checkedIds: [],
          uncheckedIds: [],
          checkedAll: false,
        }
      end

      let(:params) do
        {
          exportType: 2,
          uiState: {
            sample: {
              checkedIds: [],
              uncheckedIds: [],
              checkedAll: false,
            },
            reaction: no_checked,
            wellplate: no_checked,
            currentCollection: collection.id,
          },
          columns: {
            analyses: [],
            molecule: %w[cano_smiles],
            reaction: %w[name short_label],
            sample: %w[name external_label real_amount_value real_amount_unit created_at],
            sample_analyses: [],
            wellplate: [],
          },
        }
      end

      it 'returns correct sdf with different molfile format(ing)s' do
        # 0 with V2000 molfile that contains no dollar sign
        # 1 with V2000 molfile that contains dollar sign' do
        # 2 with V2000 molfile that contains ' do
        # 3 with V3000 molfile that contains' do
        samples.each.with_index do |sample, i|
          params[:uiState][:sample][:checkedIds] = [sample.id]
          post(
            '/api/v1/reports/export_samples_from_selections',
            params: params.to_json,
            headers: { 'CONTENT-TYPE' => 'application/json' },
          )

          expect(response['Content-Type']).to eq('chemical/x-mdl-sdfile')
          expect(response['Content-Disposition']).to include('.sdf')

          msdf = molfiles[i]
          sdf = response.body

          # Normalize line endings but preserve SDF structure
          msdf = msdf.gsub(/\r\n?/, "\n")
          sdf = sdf.gsub(/\r\n?/, "\n")

          # Remove dynamic CREATED_AT tags
          msdf = msdf.gsub(/<CREATED_AT>.+?</ms, '<')
          sdf  = sdf.gsub(/<CREATED_AT>.+?</ms, '<')

          # Replace UUIDs
          uuid_regex = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i
          msdf = msdf.gsub(uuid_regex, '<SAMPLE UUID>')
          sdf  = sdf.gsub(uuid_regex, '<SAMPLE UUID>')

          expect(sdf).to eq(msdf), "Mismatch in SDF for sample ##{i}"
        end
      end

      it 'exports sbmm reactants from reaction selection as sdf entries' do
        reaction = create(:reaction, name: 'Reaction with SBMM SDF')
        sbmm = create(:uniprot_sbmm)
        sbmm_sample = SequenceBasedMacromoleculeSample.create!(
          name: 'SBMM SDF sample',
          short_label: 'SBMM-SDF-1',
          sequence_based_macromolecule: sbmm,
          user: user,
        )

        CollectionsReaction.create!(reaction: reaction, collection: collection)
        CollectionsSequenceBasedMacromoleculeSample.create!(
          sequence_based_macromolecule_sample: sbmm_sample,
          collection: collection,
        )
        ReactionsReactantSbmmSample.create!(
          reaction: reaction,
          sequence_based_macromolecule_sample: sbmm_sample,
          position: 1,
        )

        sdf_params = params.deep_dup
        sdf_params[:columns][:sample] << 'short_label'
        sdf_params[:uiState][:reaction][:checkedIds] = [reaction.id]

        post(
          '/api/v1/reports/export_samples_from_selections',
          params: sdf_params.to_json,
          headers: { 'CONTENT-TYPE' => 'application/json' },
        )

        expect(response['Content-Type']).to eq('chemical/x-mdl-sdfile')
        expect(response['Content-Disposition']).to include('.sdf')
        expect(response.body).to include('M  END')
        expect(response.body).to include('>  <SAMPLE_NAME>')
        expect(response.body).to include('SBMM SDF sample')
        expect(response.body).to include('>  <SHORT_LABEL>')
        expect(response.body).to include('SBMM-SDF-1')
      end

      it 'exports chemical columns as SDF when only chemicals columns are selected (report_api.rb chemicals guard)' do
        chemical = create(:chemical, sample: samples[0], chemical_data: [{ 'status' => 'ordered' }])

        chem_params = params.deep_dup
        chem_params[:uiState][:sample][:checkedIds] = [chemical.sample_id]
        chem_params[:columns][:sample] = []
        chem_params[:columns][:chemicals] = ['status']

        post(
          '/api/v1/reports/export_samples_from_selections',
          params: chem_params.to_json,
          headers: { 'CONTENT-TYPE' => 'application/json' },
        )

        expect(response['Content-Type']).to eq('chemical/x-mdl-sdfile')
        expect(response.body).to include('>  <STATUS>')
        expect(response.body).to include('ordered')
      end
    end

    describe 'POST /api/v1/reports/export_samples_from_selections' do
      subject(:make_request) do
        post '/api/v1/reports/export_samples_from_selections',
             params: params, as: :json, headers: headers
      end

      let(:sample1) { create(:sample, collections: [collection]) }
      let(:sample2) { create(:sample, collections: [collection]) }

      let(:headers) do
        {
          'HTTP-ACCEPT' => 'application/vnd.ms-excel, chemical/x-mdl-sdfile',
          'CONTENT-TYPE' => 'application/json',
        }
      end

      let(:base_ui_state) do
        {
          reaction: {
            checkedIds: [],
            uncheckedIds: [],
            checkedAll: false,
          },
          wellplate: {
            checkedIds: [],
            uncheckedIds: [],
            checkedAll: false,
          },
          currentCollection: collection.id,
        }
      end

      let(:columns) do
        {
          sample: %w[
            created_at
            molfile
            target_amount_unit
            target_amount_value
            updated_at
          ],
        }
      end

      describe 'when nothing is selected' do
        let(:params) do
          {
            exportType: 1,
            uiState: base_ui_state.merge(
              sample: {
                checkedIds: [],
                uncheckedIds: [],
                checkedAll: false,
              },
            ),
            columns: columns,
          }
        end

        before { make_request }

        it 'returns status 204' do
          expect(response).to have_http_status(:no_content)
        end
      end

      describe 'when sample1 is selected' do
        before { make_request }

        let(:params) do
          {
            exportType: 1,
            uiState: base_ui_state.merge(
              sample: {
                checkedIds: [sample1.id],
                uncheckedIds: [],
                checkedAll: false,
              },
            ),
            columns: columns,
          }
        end

        it 'returns a header with excel-type' do
          expect(response['Content-Type']).to eq(excel_mime_type)
          expect(response['Content-Disposition']).to include('.xlsx')
        end
      end

      describe 'when reaction selection includes sbmm reactants' do
        let(:reaction) { create(:reaction, name: 'Reaction with SBMM', short_label: 'R-SBMM-1') }
        let(:sbmm) { create(:uniprot_sbmm) }
        let(:sbmm_sample) do
          SequenceBasedMacromoleculeSample.create!(
            name: 'SBMM export sample',
            short_label: 'SBMM-EXP-1',
            sequence_based_macromolecule: sbmm,
            user: user,
          )
        end

        let(:params) do
          {
            exportType: 1,
            uiState: base_ui_state.merge(
              sample: {
                checkedIds: [],
                uncheckedIds: [],
                checkedAll: false,
              },
              reaction: {
                checkedIds: [reaction.id],
                uncheckedIds: [],
                checkedAll: false,
              },
            ),
            columns: {
              sample: %w[name short_label],
              reaction: %w[name short_label],
            },
          }
        end

        before do
          CollectionsReaction.create!(reaction: reaction, collection: collection)
          CollectionsSequenceBasedMacromoleculeSample.create!(
            sequence_based_macromolecule_sample: sbmm_sample,
            collection: collection,
          )
          ReactionsReactantSbmmSample.create!(
            reaction: reaction,
            sequence_based_macromolecule_sample: sbmm_sample,
            position: 1,
          )

          make_request
        end

        it 'includes sbmm sample values in the exported workbook' do
          expect(response).to have_http_status(:success)

          xml_payload = ''
          Zip::File.open_buffer(response.body) do |zip|
            xml_payload = zip.glob('xl/**/*.xml').map { |entry| entry.get_input_stream.read }.join("\n")
          end

          expect(xml_payload).to include('SBMM export sample')
          expect(xml_payload).to include('SBMM-EXP-1')
        end
      end
    end

    describe 'ReportHelpers list filters' do
      let(:helpers) { Class.new { |inst| inst.extend(ReportHelpers) } }

      it 'counts productOnly as a filter for samples only' do
        expect([helpers.list_filtered?(:sample, { productOnly: true }),
                helpers.list_filtered?(:reaction, { productOnly: true })]).to eq [true, false]
      end

      it 'counts a label or a date as a filter for every table' do
        expect(%i[sample reaction wellplate].map { |t| helpers.list_filtered?(t, { fromDate: 1 }) }).to all(be true)
      end

      it 'leaves an unfiltered reaction list to the collection join' do
        expect(helpers.list_scope(:reaction, {}, collection.id)).to be_nil
      end
    end

    describe 'select-all export with list filters' do
      let(:label) { UserLabel.create!(user_id: user.id, access_level: 0, title: 'Shelf A', color: '#aaa') }
      let(:other_collection) { create(:collection, user_id: user.id) }
      let(:sample_columns) { { sample: %w[name] } }
      let(:none_selected) { { checkedIds: [], uncheckedIds: [], checkedAll: false } }

      def add_label(element)
        tag = element.reload.tag
        tag.update!(taggable_data: (tag.taggable_data || {}).merge('user_labels' => [label.id]))
      end

      def export(ui_state, columns: sample_columns, export_type: 1)
        params = {
          exportType: export_type,
          uiState: { sample: none_selected, reaction: none_selected, wellplate: none_selected,
                     currentCollection: collection.id }.merge(ui_state),
          columns: columns,
        }
        post '/api/v1/reports/export_samples_from_selections', params: params, as: :json
      end

      def sheet_names(sheet)
        file = Tempfile.new(['export', '.xlsx'])
        file.binmode
        file.write(response.body)
        file.flush
        rows = Roo::Spreadsheet.open(file.path, extension: :xlsx).sheet(sheet).to_a
        column = rows.first.index('sample name')
        rows.drop(1).filter_map { |row| row[column] }
      end

      def select_all(unchecked = [])
        { checkedIds: [], uncheckedIds: unchecked, checkedAll: true }
      end

      context 'with labelled and unlabelled samples' do
        let!(:first) { create(:sample, name: 'first', collections: [collection]) }
        let!(:second) { create(:sample, name: 'second', collections: [collection]) }

        before do
          create(:sample, name: 'plain', collections: [collection])
          add_label(second)
          add_label(first)
        end

        it 'exports the labelled samples minus the unchecked ones' do
          export({ sample: select_all([second.id]), userLabel: label.id })

          expect(sheet_names('sample')).to eq ['first']
        end

        it 'orders the rows by id' do
          export({ sample: select_all, userLabel: label.id })

          expect(sheet_names('sample')).to eq %w[first second]
        end

        it 'answers 204 when the filter matches nothing' do
          export({ sample: select_all([first.id, second.id]), userLabel: label.id })

          expect(response).to have_http_status(:no_content)
        end

        it 'answers 204 for an SDF export when the filter matches nothing' do
          export({ sample: select_all([first.id, second.id]), userLabel: label.id }, export_type: 2)

          expect(response).to have_http_status(:no_content)
        end

        it 'applies the filter to the analyses sheet' do
          export({ sample: select_all, userLabel: label.id }, columns: sample_columns.merge(analyses: %w[name]))

          expect(sheet_names('sample_analyses')).to eq %w[first second]
        end

        it 'applies the filter to the chemicals sheet' do
          export({ sample: select_all, userLabel: label.id }, columns: sample_columns.merge(chemicals: %w[status]))

          expect(sheet_names('sample_chemicals')).to eq %w[first second]
        end

        it 'applies the filter to the components sheet' do
          Sample.find_each { |sample| create(:component, sample: sample) }
          export({ sample: select_all, userLabel: label.id }, columns: sample_columns.merge(components: %w[name]))

          expect(sheet_names('sample_components')).to eq %w[first second]
        end

        it 'exports the checked samples to the components sheet' do
          Sample.find_each { |sample| create(:component, sample: sample) }
          export({ sample: { checkedIds: [second.id], uncheckedIds: [], checkedAll: false } },
                 columns: sample_columns.merge(components: %w[name]))

          expect(sheet_names('sample_components')).to eq ['second']
        end

        it 'only accepts integer ids' do
          export({ sample: { checkedIds: ['x'], uncheckedIds: [], checkedAll: false } })

          expect(response).to have_http_status(:bad_request)
        end
      end

      context 'with a collection the user cannot read' do
        let(:foreign) { create(:collection, user_id: other.id) }

        before { create(:sample, name: 'foreign', collections: [foreign]) }

        it 'answers 401 for select-all, whether or not the filter matches' do
          export({ sample: select_all, currentCollection: foreign.id })
          expect(response).to have_http_status(:unauthorized)

          export({ sample: select_all, userLabel: label.id, currentCollection: foreign.id })
          expect(response).to have_http_status(:unauthorized)
        end

        it 'answers 401 for explicit ids' do
          export({ sample: { checkedIds: [s1.id], uncheckedIds: [], checkedAll: false },
                   currentCollection: foreign.id })

          expect(response).to have_http_status(:unauthorized)
        end

        it 'answers 401 for a collection id that does not exist' do
          export({ sample: select_all, currentCollection: 0 })

          expect(response).to have_http_status(:unauthorized)
        end
      end

      context 'with a date filter sent as unix seconds' do
        before do
          create(:sample, name: 'old', collections: [collection])
            .update_columns(created_at: 10.days.ago, updated_at: 10.days.ago) # rubocop:disable Rails/SkipsModelValidations
          create(:sample, name: 'new', collections: [collection])
        end

        it 'keeps the samples created inside the range, including the whole of the end day' do
          export({ sample: select_all, fromDate: 2.days.ago.to_i, toDate: Time.zone.now.beginning_of_day.to_i,
                   filterCreatedAt: true })

          expect(sheet_names('sample')).to eq ['new']
        end
      end

      context 'with reaction samples' do
        let!(:reaction) { create(:reaction, collections: [collection]) }
        let!(:solvent) { create(:sample, name: 'solvent', collections: [collection]) }
        let!(:product) { create(:sample, name: 'product', collections: [collection]) }

        before do
          create(:sample, name: 'standalone', collections: [collection])
          create(:reactions_solvent_sample, reaction: reaction, sample: solvent)
          create(:reactions_product_sample, reaction: reaction, sample: product)
        end

        it 'leaves solvent-only samples out of an unfiltered select-all' do
          export({ sample: select_all })

          expect(sheet_names('sample')).to contain_exactly('product', 'standalone')
        end

        it 'exports only products with productOnly' do
          export({ sample: select_all, productOnly: true })

          expect(sheet_names('sample')).to eq ['product']
        end
      end

      context 'with a reaction whose product sits in another collection' do
        let!(:reaction) { create(:reaction, collections: [collection]) }

        before do
          add_label(reaction)
          create(:reactions_solvent_sample, reaction: reaction,
                                            sample: create(:sample, name: 'here', collections: [collection]))
          elsewhere = create(:sample, name: 'elsewhere', collections: [other_collection])
          create(:reactions_product_sample, reaction: reaction, sample: elsewhere)
          # Saving the reaction sample files it into the reaction's collection too.
          CollectionsSample.where(sample: elsewhere, collection: collection).delete_all
        end

        it 'leaves out samples outside the collection without a filter' do
          export({ reaction: select_all })

          expect(sheet_names('reaction')).to eq ['here']
        end

        it 'keeps the collection restriction when a label filter is set' do
          export({ reaction: select_all, userLabel: label.id })

          expect(sheet_names('reaction')).to eq ['here']
        end

        it 'ignores productOnly for reactions' do
          export({ reaction: select_all, productOnly: true })

          expect(sheet_names('reaction')).to eq ['here']
        end
      end

      context 'with a labelled and an unlabelled reaction sharing a sample' do
        before do
          shared = create(:sample, name: 'shared', collections: [collection])
          %w[labelled plain].each do |name|
            reaction = create(:reaction, collections: [collection])
            create(:reactions_solvent_sample, reaction: reaction, sample: shared)
            create(:reactions_product_sample, reaction: reaction,
                                              sample: create(:sample, name: name, collections: [collection]))
            add_label(reaction) if name == 'labelled'
          end
        end

        it 'exports the rows of the labelled reaction only' do
          export({ reaction: select_all, userLabel: label.id })

          expect(sheet_names('reaction')).to eq %w[shared labelled]
        end
      end

      context 'with wellplates' do
        let!(:labelled) { create(:wellplate, collections: [collection]) }

        before do
          add_label(labelled)
          unlabelled = create(:wellplate, collections: [collection])
          create(:well, wellplate: labelled, sample: create(:sample, name: 'in labelled', collections: [collection]))
          create(:well, wellplate: unlabelled, sample: create(:sample, name: 'in plain', collections: [collection]))
        end

        it 'exports the samples of the labelled wellplates only' do
          export({ wellplate: select_all, userLabel: label.id })

          expect(sheet_names('wellplate')).to eq ['in labelled']
        end
      end

      describe 'reaction SMILES' do
        let(:molfile) { build(:molfile, type: 'test_2') }

        def export_smiles(ui_state)
          params = {
            exportType: 0,
            uiState: { sample: none_selected, reaction: none_selected, wellplate: none_selected,
                       currentCollection: collection.id }.merge(ui_state),
            columns: {},
          }
          post '/api/v1/reports/export_reactions_from_selections', params: params, as: :json
        end

        before do
          2.times do |i|
            reaction = create(:reaction, collections: [collection])
            create(:reactions_product_sample, reaction: reaction,
                                              sample: create(:sample, molfile: molfile, collections: [collection]))
            add_label(reaction) if i.zero?
          end
        end

        it 'exports only the labelled reactions' do
          export_smiles({ reaction: select_all, userLabel: label.id })

          expect(response.body.split("\r\n").size).to eq 1
        end

        it 'answers 204 when the filter matches nothing' do
          export_smiles({ reaction: select_all, userLabel: label.id + 1 })

          expect(response).to have_http_status(:no_content)
        end
      end
    end

    describe 'GET /api/v1/reports/excel_reaction and excel_wellplate' do
      let(:wellplate) { create(:wellplate, collections: [collection]) }

      it 'exports the samples of a reaction' do
        get '/api/v1/reports/excel_reaction', params: { id: r1.id }

        expect(response).to have_http_status(:ok)
        expect(response.header['Content-Type']).to eq excel_mime_type
      end

      it 'exports the samples of a wellplate' do
        get '/api/v1/reports/excel_wellplate', params: { id: wellplate.id }

        expect(response).to have_http_status(:ok)
      end

      it 'rejects an id that is not an integer' do
        %w[excel_reaction excel_wellplate].each do |route|
          get "/api/v1/reports/#{route}", params: { id: "#{r1.id},#{r2.id}" }

          expect(response).to have_http_status(:bad_request)
        end
      end
    end

    describe 'POST /api/v1/reports/export_reactions_from_selections' do
      let!(:other_user) { create(:person) }
      let!(:collection_with_shares) do
        create(:collection, user: other_user, shared: true).tap do |other_collection|
          create(:collection_share, collection: other_collection, shared_with: user, sample_detail_level: 0)
        end
      end

      let!(:molfile) { build(:molfile, type: 'test_2') }

      let!(:sample0) do
        build(:sample, created_by: user.id, molfile: molfile, collections: [collection])
      end

      let!(:sample1) do
        build(:sample, created_by: user.id, molfile: molfile, collections: [collection])
      end

      let!(:sample2) do
        build(:sample, created_by: user.id, molfile: molfile, collections: [collection])
      end

      let!(:sample3) do
        build(:sample, created_by: user.id, molfile: molfile, collections: [collection])
      end

      let!(:sample4) do
        build(:sample, created_by: user.id, molfile: molfile, collections: [collection])
      end

      let(:smiles0) { sample0.molecule.cano_smiles }
      let(:smiles1) { sample1.molecule.cano_smiles }
      let(:smiles2) { sample2.molecule.cano_smiles }
      let(:smiles3) { sample3.molecule.cano_smiles }
      let(:smiles4) { sample4.molecule.cano_smiles }
      let!(:reaction) do
        build(:valid_reaction,
              name: 'Reaction 0',
              starting_materials: [sample0, sample1],
              solvents: [sample2],
              reactants: [sample3],
              products: [sample4],
              collections: [collection, collection_with_shares])
      end

      let(:params) do
        {
          exportType: 0,
          uiState: {
            sample: {
              checkedIds: [],
              uncheckedIds: [],
              checkedAll: false,
            },
            reaction: {
              checkedIds: [reaction.id],
              uncheckedIds: [],
              checkedAll: false,
            },
            wellplate: {
              checkedIds: [],
              uncheckedIds: [],
              checkedAll: false,
            },
            currentCollection: collection.id,
          },
          columns: {},
        }
      end

      let(:subj) { Class.new { |inst| inst.extend(ReportHelpers) } }
      let(:result) { subj.reaction_smiles_hash(collection.id, reaction.id, false, user.id) }
      let(:result_for_shared) do
        subj.reaction_smiles_hash(collection_with_shares.id, reaction.id, false, other_user.id)
      end

      before do
        collection
        collection_with_shares
        sample0.save!
        sample1.save!
        sample2.save!
        sample3.save!
        sample4.save!
        reaction.save!
      end

      it 'returns a txt file with reaction smiles' do
        post('/api/v1/reports/export_reactions_from_selections',
             params: params.to_json,
             headers: {
               'HTTP_ACCEPT' => 'text/plain, text/csv',
               'CONTENT-TYPE' => 'application/json',
             })
        expect(response['Content-Type']).to eq('text/csv')
      end

      describe 'ReportHelpers' do
        it 'concats the smiles SM>>P' do
          expect(subj.r_smiles_0(result.first.second)).to eq(
            "#{[smiles0, smiles1].join('.')}>>#{smiles4}",
          )
        end

        it 'concats the smiles SM.R>>P' do
          expect(subj.r_smiles_1(result.first.second)).to eq(
            "#{[smiles0, smiles1, smiles2].join('.')}>>#{smiles4}",
          )
        end

        it 'concats the smiles SM.R.S>>P' do
          expect(subj.r_smiles_2(result.first.second)).to eq(
            "#{[smiles0, smiles1, smiles2, smiles3].join('.')}>>#{smiles4}",
          )
        end

        it 'concats the smiles SM>R>P' do
          expect(subj.r_smiles_3(result.first.second)).to eq(
            "#{[smiles0, smiles1].join('.')}>#{smiles2}>#{smiles4}",
          )
        end

        it 'concats the smiles SM>R.S>P' do
          expect(subj.r_smiles_4(result.first.second)).to eq(
            "#{[smiles0, smiles1].join('.')}>#{[smiles2, smiles3].join('.')}>#{smiles4}",
          )
        end

        context 'with user owned reaction,' do
          it 'queries the cano_smiles from reaction associated samples' do
            expect(result.fetch(reaction.id.to_s)).to eq(
              '0' => [smiles0, smiles1],
              '1' => [smiles2],
              '2' => [smiles3],
              '3' => [smiles4],
            )
          end
        end

        context 'with shared reaction,' do
          it 'returns * as smiles for hidden structure' do
            expect(result_for_shared.fetch(reaction.id.to_s)).to eq(
              '0' => ['*', '*'],
              '1' => ['*'],
              '2' => ['*'],
              '3' => ['*'],
            )
          end
        end
      end
    end

    describe 'GET /api/v1/archives/all' do
      before do
        get '/api/v1/archives/all'
      end

      it 'return all reports of the user' do
        archives = JSON.parse(response.body)['archives']
        expect(archives.count).to eq(3)
        expect(archives.pluck('id')).to include(rp1.id, rp2.id, rp3.id)
      end
    end

    describe 'POST /api/v1/archives/downloadable' do
      before do
        params = { ids: [rp3.id, rp2.id] }
        post '/api/v1/archives/downloadable', params: params
      end

      it 'return reports which can be downloaded now' do
        archives = JSON.parse(response.body)['archives']
        expect(archives.count).to eq(1)
        expect(archives.first['id']).to eq(rp3.id)
      end
    end

    describe 'Delete /api/v1/archives/' do
      #  let!(:a_mine) { user.reports.create }
      #  let!(:a_others) { other.reports.create }

      context 'with my archive' do
        before do
          delete "/api/v1/archives/#{rp1.id}"
        end

        it 'delete the archive' do
          archive = Report.find_by(id: rp1.id)
          expect(response.status).to eq 200
          expect(archive).to be_nil
        end
      end

      context 'with other\'s archive' do
        before do
          delete "/api/v1/archives/#{rp_others.id}"
        end

        it 'can not delete the archive' do
          archive = Report.find_by(id: rp_others.id)
          expect(response.status).to eq 404
          expect(archive).not_to be_nil
        end
      end
    end

    describe 'POST /api/v1/reports' do
      let(:filename) { 'ELN' }
      let(:params) do
        {
          objTags: [
            { id: r1.id, type: 'reaction' },
            { id: r2.id, type: 'reaction' },
          ],
          splSettings: [
            { text: 'diagram', checked: true },
            { text: 'analyses', checked: true },
          ],
          rxnSettings: [
            { text: 'diagram', checked: true },
            { text: 'material', checked: true },
          ],
          siRxnSettings: [
            { text: 'Name', checked: true },
            { text: 'CAS', checked: true },
          ],
          configs: [
            { text: 'page_break', checked: true },
            { text: 'whole_diagram', checked: true },
          ],
          imgFormat: 'png',
          fileName: filename,
          molSerials: [
            { mol: { id: 1, svgPath: '1a.svg', sumFormula: 'C6H6', iupacName: 'benzene' }, value: '1a' },
          ],
          prdAtts: [
            {
              id: 2,
              attachable_id: 121,
              attachable_type: 'Report',
              filename: 'kit_logo.png',
              identifier: '123',
              checksum: '456',
              storage: 'local',
              created_by: 1,
              created_for: 1,
              version: 0,
              created_at: '2018-01-03T15:24:19.751Z',
              updated_at: '2018-01-03T15:24:28.686Z',
              content_type: 'image/png',
              bucket: '1',
              key: '987',
              thumb: true,
              folder: '',
              kind: 'GCMS',
            },
          ],
          templateId: 1,
        }
      end

      it 'returns a created -standard- report' do
        params[:template] = 'standard'
        post '/api/v1/reports', params: params, as: :json

        expect(response.body).to include(filename)
      end

      it 'returns a created -supporting_information- report' do
        params[:template] = 'supporting_information'
        post '/api/v1/reports', params: params, as: :json
        expect(response.body).to include(filename)
      end
    end

    describe 'GET /api/v1/download_report/file' do
      let!(:report) do
        create(
          :attachment,
          filename: "#{rp1.file_name}.#{ext}",
          attachable_id: rp1.id,
          attachable_type: 'Report',
          content_type: docx_mime_type,
        )
        rp1
      end

      it 'returns a header with ext' do
        get '/api/v1/download_report/file', params: { id: report.id, ext: ext }
        expect(response['Content-Disposition']).to include("#{report.file_name}.#{ext}")
      end
    end
  end
end
# rubocop:enable RSpec/MultipleMemoizedHelpers, RSpec/NestedGroups, RSpec/IndexedLet
