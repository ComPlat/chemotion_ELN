# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::GenericElementAPI do
  context 'with authorized user' do
    let(:user) { create(:person) }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    end

    describe 'GET /api/v1/generic_elements/' do
      it 'returns an object with generic_elements' do
        get '/api/v1/generic_elements/'
        body = JSON.parse(response.body)

        expect(body['generic_elements']).to be_an(Array)
      end
    end
  end
end
