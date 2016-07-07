require 'rails_helper'

describe Chemotion::ReportAPI do
  context 'authorized user logged in' do
    let(:user) { create(:user) }
    let(:docx_mime_type) { "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }

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
  end
end
