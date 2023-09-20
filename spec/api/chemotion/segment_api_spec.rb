# frozen_string_literal: true

require 'rails_helper'

# rubocop:disable RSpec/NestedGroups
describe Labimotion::SegmentAPI do
  context 'with authorized user' do
    let(:user) { create(:person) }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    end

    describe 'GET /api/v1/segments/klasses' do
      it 'fetch segment klasses' do
        get '/api/v1/segments/klasses'
        body = JSON.parse(response.body)

        expect(body['klass']).to be_an(Array)
      end

    end
  end
end
# rubocop:enable RSpec/NestedGroups
