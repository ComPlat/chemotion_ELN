# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Usecases::Authentication::BuildToken do
  describe '.execute!' do
    subject(:excute) { described_class.execute!(params) }

    let(:user) { create(:person) }
    let(:username) { user.name_abbreviation }
    let(:password) { 'testtest' }
    let(:params) { { username: username, password: password } }

    it 'returns a token' do
      allow(JsonWebToken).to receive(:encode).and_return('my-token')
      expect(excute).to eq('my-token')
    end

    it_behaves_like 'a lockable token builder'
  end

  describe '.by_user' do
    let(:user) { create(:person) }

    it 'returns a token without checking a password' do
      allow(JsonWebToken).to receive(:encode).and_return('my-token')
      expect(described_class.by_user(user)).to eq('my-token')
    end

    it 'returns nil without a user' do
      expect(described_class.by_user(nil)).to be_nil
    end
  end
end
