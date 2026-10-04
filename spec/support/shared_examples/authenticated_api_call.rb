# frozen_string_literal: true

RSpec.shared_examples 'authenticated API call' do
  # subject must be an API call with `headers: authorization_header` and let(:authorization_header) for legit user.
  describe 'authenticated' do
    it 'status 200 (201/204)' do
      subject
      expect([200, 201, 204]).to include(response.status)
    end
  end

  describe 'unauthenticated' do
    let(:authorization_header) { content_type_header }
    it 'status 401' do
      subject
      expect(response).to have_http_status :unauthorized
    end
  end
end
