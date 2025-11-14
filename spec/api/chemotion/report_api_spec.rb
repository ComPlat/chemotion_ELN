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
