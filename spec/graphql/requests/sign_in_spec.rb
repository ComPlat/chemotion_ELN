# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Sign in ', type: :request do
  subject { response.body }

  let(:user_email) { 'cu1@test.test' }
  let(:user_name_abbreviation) { 'CU1' }
  let(:user_password) { 'secretpw' }
  let(:username) { user_name_abbreviation }
  let(:password) { user_password }
  let(:mocked_token) { 'a-json-web-token' }

  let(:query) do
    "
      mutation($username: String!, $password: String!) {
        signIn(username: $username, password: $password) {
          token
        }
      }
    "
  end

  let(:expected_response) do
    {
      data: {
        signIn: {
          token: mocked_token
        }
      }
    }.to_json
  end

  let(:error_response) do
    {
      errors: [
        { status: 401, title: 'AuthenticationError', message: 'Wrong credentials' }
      ]
    }.to_json
  end

  before do
    create(:user, email: user_email, name_abbreviation: user_name_abbreviation,
                  password: user_password, password_confirmation: user_password)
    allow(JsonWebToken).to receive(:encode).and_return(mocked_token)

    post '/graphql', params: { query: query, variables: { username: username, password: password } }
  end

  it { is_expected.to eq(expected_response) }

  context 'when username is wrong' do
    let(:username) { 'wrong' }

    it { is_expected.to eq(error_response) }
  end

  context 'when password is wrong' do
    let(:password) { 'wrong' }

    it { is_expected.to eq(error_response) }
  end
end
