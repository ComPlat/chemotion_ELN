# frozen_string_literal: true

RSpec.describe Chemotion::CommonTemplateAPI do
  describe 'GET /api/v1/common_template' do
    it 'returns the right http status' do
      expect(response).to have_http_status :ok
    end

    # TODO: add more tests
  end
end
