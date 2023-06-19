# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::ReportTemplateAPI do
  context 'with authorized user logged in' do
    let(:user) { create(:user) }
    let!(:report_template1) { create(:report_template) }
    let!(:report_template2) { create(:report_template) }

    before do
      allow_any_instance_of(WardenAuthentication).to(
        receive(:current_user).and_return(user),
      )
    end

    describe 'GET /api/v1/report_templates' do
      before do
        get '/api/v1/report_templates'
      end

      it 'returns a list report template' do
        expect(
          JSON.parse(response.body)['templates'].count,
        ).to eq 2

        expect(
          JSON.parse(response.body)['templates'].collect do |e|
            [e['id'], e['name']]
          end,
        ).to match_array(
          ReportTemplate.pluck(:id, :name),
        )
      end
    end

    describe 'POST /api/v1/report_templates' do
      before do
        params = {
          name: 'Report template',
          report_type: 'Report template type',
          file: :template_upload,
        }
        post(
          '/api/v1/report_templates',
          params: params.to_json,
          headers: {
            'HTTP-ACCEPT' => 'application/vnd.ms-excel, chemical/x-mdl-sdfile',
            'CONTENT-TYPE' => 'multipart/form-data',
          },
        )
      end

      it 'returns error 401' do
        expect(
          JSON.parse(response.body)['error'],
        ).to eq '401 Unauthorized'
      end
    end

    describe 'DELETE /api/v1/report_templates/{id}' do
      before do
        delete(
          "/api/v1/report_templates/#{report_template1.id}",
        )
      end

      it 'returns error 401' do
        expect(
          JSON.parse(response.body)['error'],
        ).to eq '401 Unauthorized'
      end
    end

    describe 'GET /api/v1/report_templates/{id}' do
      before do
        get(
          "/api/v1/report_templates/#{report_template1.id}",
          headers: {
            'HTTP-ACCEPT' => 'application/vnd.ms-excel, chemical/x-mdl-sdfile',
            'CONTENT-TYPE' => 'multipart/form-data',
          },
        )
      end

      it 'returns error 401' do
        expect(
          JSON.parse(response.body)['error'],
        ).to eq '401 Unauthorized'
      end
    end

    describe 'PUT /api/v1/report_templates/{id}' do
      before do
        params = {
          name: 'Report template',
          report_type: 'Report template type',
        }
        put(
          "/api/v1/report_templates/#{report_template1.id}",
          params: params.to_json,
          headers: {
            'HTTP-ACCEPT' => 'application/vnd.ms-excel, chemical/x-mdl-sdfile',
            'CONTENT-TYPE' => 'multipart/form-data',
          },
        )
      end

      it 'returns error 401' do
        expect(
          JSON.parse(response.body)['error'],
        ).to eq '401 Unauthorized'
      end
    end
  end

  context 'with Admin user logged in' do
    let(:admin) { create(:admin) }
    let!(:report_template1) { create(:report_template) }

    before do
      allow_any_instance_of(WardenAuthentication).to(
        receive(:current_user).and_return(admin),
      )
    end

    describe 'POST /api/v1/report_templates' do
      before do
        params = {
          name: 'Report template',
          report_type: 'Report template type',
          file: fixture_file_upload(Rails.root.join('spec/fixtures/upload.png')),
        }
        post(
          '/api/v1/report_templates',
          params: params,
          headers: {
            'HTTP-ACCEPT' => 'application/vnd.ms-excel, chemical/x-mdl-sdfile',
            'CONTENT-TYPE' => 'multipart/form-data',
          },
        )
      end

      it 'returns true' do
        expect(admin.is_a?(Admin)).to be true
        expect(
          JSON.parse(response.body),
        ).to be true
      end
    end

    describe 'DELETE /api/v1/report_templates/{id}' do
      before do
        delete(
          "/api/v1/report_templates/#{report_template1.id}",
        )
      end

      it 'returns error true' do
        expect(
          JSON.parse(response.body),
        ).to be true
      end
    end

    describe 'GET /api/v1/report_templates/{id}' do
      before do
        get(
          "/api/v1/report_templates/#{report_template1.id}",
          headers: {
            'HTTP-ACCEPT' => 'application/vnd.ms-excel, chemical/x-mdl-sdfile',
            'CONTENT-TYPE' => 'multipart/form-data',
          },
        )
      end

      it 'returns report template' do
        expect(
          JSON.parse(response.body)['template']['id'],
        ).to eq report_template1.id
      end
    end

    describe 'PUT /api/v1/report_templates/{id}' do
      before do
        params = {
          name: 'Report template',
          report_type: 'Report template type',
          file: fixture_file_upload(Rails.root.join('spec/fixtures/upload.png')),
        }
        put(
          "/api/v1/report_templates/#{report_template1.id}",
          params: params,
          headers: {
            'HTTP-ACCEPT' => 'application/vnd.ms-excel, chemical/x-mdl-sdfile',
            'CONTENT-TYPE' => 'multipart/form-data',
          },
        )
      end

      it 'returns true' do
        expect(
          JSON.parse(response.body),
        ).to be true
      end

      it 'file was saved as attachment' do
        expect(Attachment.find(ReportTemplate.find(report_template1.id).attachment_id).filename).to eq('upload.png')
      end
    end
  end
end
