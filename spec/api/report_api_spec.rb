# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::ReportAPI do
  context 'authorized user logged in' do
    let(:user) { create(:user) }
    let(:other) { create(:user) }
    let(:docx_mime_type) {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
    let(:excel_mime_type) { 'application/vnd.ms-excel' }
    let!(:rp1) {
      create(:report, :downloadable, user: user, file_name: 'ELN_Report_1')
    }
    let!(:rp2) { create(:report, :undownloadable, user: user) }
    let!(:rp3) { create(:report, :downloadable, user: user) }
    let!(:rp_others) { create(:report, user: other) }
    let!(:s1)   { create(:sample) }
    let!(:s2)   { create(:sample) }
    let!(:r1)   { create(:reaction) }
    let!(:r2)   { create(:reaction) }
    let!(:c)    { create(:collection, user_id: user.id) }

    before do
      allow_any_instance_of(WardenAuthentication).to(
        receive(:current_user).and_return(user)
      )
      CollectionsSample.create!(sample: s1, collection: c)
      CollectionsSample.create!(sample: s2, collection: c)
      CollectionsReaction.create!(reaction: r1, collection: c)
      CollectionsReaction.create!(reaction: r2, collection: c)
    end

    describe 'GET /api/v1/reports/docx' do
      before do
        params = { id: r1.id.to_s }
        get '/api/v1/reports/docx', params
      end

      it 'returns a header with docx-type' do
        expect(response['Content-Type']).to eq(docx_mime_type)
        expect(response['Content-Disposition']).to include('.docx')
      end
    end

    describe 'POST /api/v1/reports/export_samples_from_selections' do
      let(:c)        { create(:collection, user_id: user.id) }
      let(:sample_1) { create(:sample) }
      let(:sample_2) { create(:sample) }

      before do
        CollectionsSample.create!(sample: sample_1, collection: c)
        CollectionsSample.create!(sample: sample_2, collection: c)
      end

      before do
        params = {
          exportType: 1,
          uiState: {
            sample: {
              checkedIds: [sample_1.id],
              uncheckedIds: [],
              checkedAll: false,
            },
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
            currentCollection: c.id,
            isSync: false
          },
          columns: %w(
            target_amount_value target_amount_unit
            created_at updated_at molfile
          )
        }
        post(
          '/api/v1/reports/export_samples_from_selections', params.to_json,
          'HTTP_ACCEPT' => 'application/vnd.ms-excel, chemical/x-mdl-sdfile',
          'CONTENT_TYPE' => 'application/json'
        )
      end

      it 'returns a header with excel-type' do
        expect(response['Content-Type']).to eq(excel_mime_type)
        expect(response['Content-Disposition']).to include('.xlsx')
      end
    end

    describe 'POST /api/v1/reports/export_reactions_from_selections' do
      let!(:c1) { create(:collection, user_id: user.id) }
      let!(:c2) {
        create(
          :collection,
          user_id: user.id + 1, is_shared: true, sample_detail_level: 0
        )
      }
      let!(:mf) {
        IO.read(Rails.root.join('spec', 'fixtures', 'test_2.mol'))
      }
      let!(:s0) {
        build(:sample, created_by: user.id, molfile: mf, collections: [c1])
      }
      let!(:s1) {
        build(:sample, created_by: user.id, molfile: mf, collections: [c1])
      }
      let!(:s2) {
        build(:sample, created_by: user.id, molfile: mf, collections: [c1])
      }
      let!(:s3) {
        build(:sample, created_by: user.id, molfile: mf, collections: [c1])
      }
      let!(:s4) {
        build(:sample, created_by: user.id, molfile: mf, collections: [c1])
      }
      let(:smi_0) { s0.molecule.cano_smiles }
      let(:smi_1) { s1.molecule.cano_smiles }
      let(:smi_2) { s2.molecule.cano_smiles }
      let(:smi_3) { s3.molecule.cano_smiles }
      let(:smi_4) { s4.molecule.cano_smiles }
      let!(:rxn) {
        build(:valid_reaction,
              name: 'Reaction 0',
              starting_materials: [s0, s1],
              solvents: [s2],
              reactants: [s3],
              products: [s4],
              collections: [c1, c2])
      }
      let(:params) {
        {
          exportType: 0, columns: [],
          uiState: {
            sample: {
              checkedIds: [],
              uncheckedIds: [],
              checkedAll: false
            },
            reaction: {
              checkedIds: [rxn.id],
              uncheckedIds: [],
              checkedAll: false
            },
            wellplate: {
              checkedIds: [],
              uncheckedIds: [],
              checkedAll: false
            },
            currentCollection: c1.id,
            isSync: false
          }
        }
      }

      let(:subj) { Class.new { |inst| inst.extend(ReportHelpers) } }
      let(:result) { subj.reaction_smiles_hash(c1.id, rxn.id, false, user.id) }
      let(:result_for_shared) {
        subj.reaction_smiles_hash(c2.id, rxn.id, false, user.id + 1)
      }

      before do
        c1.save!
        c2.save!
        s0.save!
        s1.save!
        s2.save!
        s3.save!
        s4.save!
        rxn.save!
      end

      it 'returns a txt file with reaction smiles' do
        post(
          '/api/v1/reports/export_reactions_from_selections', params.to_json,
          'HTTP_ACCEPT' => 'text/plain, text/csv',
          'CONTENT_TYPE' => 'application/json'
        )
        expect(response['Content-Type']).to eq('text/csv')
      end

      describe 'ReportHelpers' do
        it 'concats the smiles SM>>P' do
          expect(subj.r_smiles_0(result.first.second)).to eq(
            [smi_0, smi_1].join('.') + '>>' + smi_4
          )
        end
        it 'concats the smiles SM.R>>P' do
          expect(subj.r_smiles_1(result.first.second)).to eq(
            [smi_0, smi_1, smi_2].join('.') + '>>' + smi_4
          )
        end
        it 'concats the smiles SM.R.S>>P' do
          expect(subj.r_smiles_2(result.first.second)).to eq(
            [smi_0, smi_1, smi_2, smi_3].join('.') + '>>' + smi_4
          )
        end
        it 'concats the smiles SM>R>P' do
          expect(subj.r_smiles_3(result.first.second)).to eq(
            [smi_0, smi_1].join('.') + '>' + smi_2 \
            + '>' + smi_4
          )
        end
        it 'concats the smiles SM>R.S>P' do
          expect(subj.r_smiles_4(result.first.second)).to eq(
            [smi_0, smi_1].join('.') + '>' + [smi_2, smi_3].join('.') \
            + '>' + smi_4
          )
        end
        context 'user owned reaction, ' do
          it 'queries the cano_smiles from reaction associated samples' do
            expect(result.fetch(rxn.id.to_s)).to eq(
              {
                '0' => [smi_0, smi_1],
                '1' => [smi_2],
                '2' => [smi_3],
                '3' => [smi_4]
              }
            )
          end
        end
        context 'shared reaction,' do
          it 'returns * as smiles for hidden structure' do
            expect(result_for_shared.fetch(rxn.id.to_s)).to eq(
              {
                '0' => ['*', '*'],
                '1' => ['*'],
                '2' => ['*'],
                '3' => ['*']
              }
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
        expect(archives.map { |a| a['id'] }).to include(rp1.id, rp2.id, rp3.id)
      end
    end

    describe 'POST /api/v1/archives/downloadable' do
      before do
        params = { ids: [rp3.id, rp2.id] }
        post '/api/v1/archives/downloadable', params
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

      context 'my archive' do
        before do
          delete "/api/v1/archives/#{rp1.id}"
        end

        it 'delete the archive' do
          archive = Report.find_by(id: rp1.id)
          expect(response.status).to eq 200
          expect(archive).to be_nil
        end
      end

      context 'other\'s archive' do
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
      let(:fileName) { 'ELN' }
      let(:params) do
        {
          objTags: "[{\"id\":#{r1.id},\"type\":\"reaction\"}, \
            {\"id\":#{r2.id},\"type\":\"reaction\"}]",
          splSettings: "[{\"text\":\"diagram\",\"checked\":true}, \
            {\"text\":\"analyses\",\"checked\":true}]",
          rxnSettings: "[{\"text\":\"diagram\",\"checked\":true}, \
            {\"text\":\"material\",\"checked\":true}]",
          configs: "[{\"text\":\"page_break\",\"checked\":true}, \
            {\"text\":\"whole_diagram\",\"checked\":true}]",
          imgFormat: 'png',
          fileName: fileName,
          molSerials: "[{\"mol\":{\"id\":1, \"svgPath\":\"1a.svg\", \
            \"sumFormula\":\"C6H6\", \"iupacName\":\"benzene\"}, \
            \"value\":\"1a\"}]"
        }
      end

      it 'returns a created -standard- report' do
        params[:template] = "standard"
        post '/api/v1/reports', params
        expect(response.body).to include(fileName)
      end

      it 'returns a created -supporting_information- report' do
        params[:template] = "supporting_information"
        post '/api/v1/reports', params
        expect(response.body).to include(fileName)
      end
    end

    describe 'GET /api/v1/download_report/docx' do
      before do
        params = { id: rp1.id }
        allow(File).to receive(:read).and_return('stubbed read')
        get '/api/v1/download_report/docx', params
      end

      it 'returns a header with docx-type' do
        expect(response['Content-Type']).to eq(docx_mime_type)
        expect(response['Content-Disposition']).to(
          include(rp1.file_name + '.docx')
        )
      end
    end
  end
end
