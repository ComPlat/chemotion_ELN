require 'rails_helper'

describe Chemotion::PublicAPI do
  describe ' GET /api/v1/public/ping' do
    before { get('/api/v1/public/ping','', 'AUTHORIZATION' => 'Bearer qwerty') }
    it 'responds 204' do
      expect(response.status).to eq 204
    end
  end
end
