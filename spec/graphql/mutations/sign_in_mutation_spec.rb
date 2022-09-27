# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Mutations::SignInMutation do
  subject { described_class }

  let(:mutation) { described_class.new(object: {}, context: {}, field: nil) }

  it { is_expected.to define_gql_argument(:username).with_type(GraphQL::Types::String).required! }
  it { is_expected.to define_gql_argument(:password).with_type(GraphQL::Types::String).required! }

  it { is_expected.to define_gql_field(:token).with_type(GraphQL::Types::String) }
  it { is_expected.not_to may_return_null(:token) }

  describe '#resolve' do
    subject(:resolve) { mutation.resolve(username: username, password: password) }

    let(:user_email) { 'cu1@test.test' }
    let(:user_name_abbreviation) { 'CU1' }
    let(:user_password) { 'secretpw' }
    let(:username) { user_name_abbreviation }
    let(:password) { user_password }

    before do
      create(:user, email: user_email, name_abbreviation: user_name_abbreviation,
                    password: user_password, password_confirmation: user_password)
    end

    it 'returns a hash with required keys' do
      expect(resolve.keys).to eql([:token])
    end

    context 'when username is email' do
      let(:username) { user_email }

      it 'returns a hash with required keys' do
        expect(resolve.keys).to eql([:token])
      end
    end

    context 'when username is invalid' do
      let(:username) { 'unknown-username' }

      it 'raises an error' do
        expect { resolve }.to raise_error(Errors::AuthenticationError)
      end
    end

    context 'when password is invalid' do
      let(:password) { 'wrong-password' }

      it 'raises an error' do
        expect { resolve }.to raise_error(Errors::AuthenticationError)
      end
    end
  end

  describe '#ready?' do
    subject { mutation.ready? }

    it { is_expected.to eq(true) }
  end
end
