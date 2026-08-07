# frozen_string_literal: true

# rubocop:disable Rails/DurationArithmetic

require 'rails_helper'

describe Chemotion::AuthenticationAPI do
  describe 'POST /api/v1/authentication/token' do
    subject(:execute_request) { post('/api/v1/authentication/token', params: params) }

    let(:build_user) { create(:person) }
    let(:params) do
      {
        username: build_user.name_abbreviation,
        password: 'testtest',
      }
    end

    context 'when use case returns a token' do
      before do
        allow(JsonWebToken).to receive(:encode).and_return('my-token')
        execute_request
      end

      it 'responds 201' do
        expect(response).to have_http_status :created
      end

      it 'responds a hash with a token' do
        expect(parsed_json_response).to eq({ 'token' => 'my-token' })
      end
    end

    context 'when use case returns nil' do
      before do
        allow(Usecases::Authentication::BuildToken).to receive(:execute!).and_return(nil)
        execute_request
      end

      it 'responds an error' do
        expect(response).to have_http_status :unauthorized
      end
    end
  end
end

# rubocop:enable Rails/DurationArithmetic
