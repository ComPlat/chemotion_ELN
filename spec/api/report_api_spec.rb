require 'rails_helper'

describe Chemotion::ReportAPI do
  context 'authorized user logged in' do
    let(:user) { create(:user) }
    let(:docx_mime_type) { "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
    let(:excel_mime_type) { "application/vnd.ms-excel" }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    end

    describe 'GET /api/v1/reports/docx' do
      let(:r1)   { create(:reaction, id: 1) }

      before {
        params = { id: "#{r1.id}" }
        get '/api/v1/reports/docx', params
      }

      it 'returns a header with docx-type' do
        expect(response["Content-Type"]).to eq(docx_mime_type)
        expect(response["Content-Disposition"]).to include(".docx")
      end
    end

    describe 'GET /api/v1/multiple_reports/docx' do
      let(:r1)   { create(:reaction, id: 1) }
      let(:r2)   { create(:reaction, id: 2) }

      before {
        params = {
          ids: "#{r1.id}_#{r2.id}",
          settings: "formula_material_description_purification_tlc_observation_analysis_literature",
          configs: "pagebreak"
        }
        get '/api/v1/multiple_reports/docx', params
      }

      it 'returns a header with docx-type' do
        expect(response["Content-Type"]).to eq(docx_mime_type)
        expect(response["Content-Disposition"]).to include(".docx")
      end
    end

    describe 'GET /api/v1/reports/export_samples_from_selections' do
      let(:c)        { create(:collection, user_id: user.id) }
      let(:sample_1) { create(:sample) }
      let(:sample_2) { create(:sample) }

      before do
        CollectionsSample.create!(sample: sample_1, collection: c)
        CollectionsSample.create!(sample: sample_2, collection: c)
      end

      before {
        params = {  type: "sample",
                    checkedIds: "#{sample_1.id}",
                    uncheckedIds: "",
                    checkedAll: false,
                    currentCollection: c.id,
                    removedColumns: "target_amount_value,target_amount_unit,created_at,updated_at,molfile" }
        get '/api/v1/reports/export_samples_from_selections', params
      }

      it 'returns a header with excel-type' do
        expect(response["Content-Type"]).to eq(excel_mime_type)
        expect(response["Content-Disposition"]).to include(".xlsx")
      end
    end
  end
end
