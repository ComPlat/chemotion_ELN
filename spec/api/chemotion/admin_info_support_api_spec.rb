# frozen_string_literal: true

RSpec.describe Chemotion::AdminInfoSupportAPI do
  let!(:admin) { create(:admin) }
  let!(:person) { create(:person) }
  let(:warden_instance) { instance_double(WardenAuthentication) }

  describe 'when the current user is an admin' do
    before do
      allow(WardenAuthentication).to receive(:new).and_return(warden_instance)
      allow(warden_instance).to receive(:current_user).and_return(admin)
    end

    describe 'GET /api/v1/admin/info_support_links' do
      let!(:enabled_link) { create(:info_support_link, label: 'Local RDM', url: 'https://rdm.example.org', enabled: true) }
      let!(:disabled_link) { create(:info_support_link, enabled: false) }

      it 'returns all links including disabled ones' do
        get '/api/v1/admin/info_support_links'
        expect(response).to have_http_status(:ok)
        labels = parsed_json_response.pluck('label')
        expect(labels).to include(enabled_link.label, disabled_link.label)
      end
    end

    describe 'POST /api/v1/admin/info_support_links' do
      it 'creates a link with valid params' do
        expect do
          post '/api/v1/admin/info_support_links',
               params: { label: 'Local RDM', url: 'https://rdm.example.org', position: 1 }
        end.to change(InfoSupportLink, :count).by(1)

        expect(response).to have_http_status(:created).or have_http_status(:ok)
        expect(parsed_json_response['label']).to eq('Local RDM')
      end

      it 'returns 422 for an invalid url' do
        post '/api/v1/admin/info_support_links', params: { label: 'Bad', url: 'not-a-url' }
        expect(response).to have_http_status(:unprocessable_entity)
      end
    end

    describe 'PUT /api/v1/admin/info_support_links/:id' do
      let!(:link) { create(:info_support_link, label: 'Old', enabled: true) }

      it 'updates fields' do
        put "/api/v1/admin/info_support_links/#{link.id}", params: { label: 'New', enabled: false }
        expect(response).to have_http_status(:ok)
        expect(link.reload.label).to eq('New')
        expect(link.reload.enabled).to be(false)
      end
    end

    describe 'DELETE /api/v1/admin/info_support_links/:id' do
      let!(:link) { create(:info_support_link) }

      it 'deletes the link' do
        expect do
          delete "/api/v1/admin/info_support_links/#{link.id}"
        end.to change(InfoSupportLink, :count).by(-1)
        expect(response).to have_http_status(:no_content)
      end
    end
  end

  describe 'when the current user is not an admin' do
    before do
      allow(WardenAuthentication).to receive(:new).and_return(warden_instance)
      allow(warden_instance).to receive(:current_user).and_return(person)
    end

    it 'rejects GET with 401' do
      get '/api/v1/admin/info_support_links'
      expect(response).to have_http_status(:unauthorized)
    end

    it 'rejects POST with 401' do
      post '/api/v1/admin/info_support_links', params: { label: 'X', url: 'https://x.example.org' }
      expect(response).to have_http_status(:unauthorized)
    end
  end
end
