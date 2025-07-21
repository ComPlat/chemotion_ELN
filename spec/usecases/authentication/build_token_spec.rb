# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Usecases::Authentication::BuildToken do
  describe '.execute!' do
    subject(:excute) { described_class.execute!(params) }

    let(:user) { create(:person) }
    let(:params) do
      {
        username: user.name_abbreviation,
        password: 'testtest',
      }
    end

    it 'returns a token' do
      allow(JsonWebToken).to receive(:encode).and_return('my-token')
      expect(excute).to eq('my-token')
    end

    context 'when user not found' do
      let(:params) do
        {
          username: 'unknown-user',
          password: 'testtest',
        }
      end

      it 'returns nil' do
        expect(excute).to be_nil
      end
    end

    context 'when user password is wrong' do
      let(:params) do
        {
          username: user.name_abbreviation,
          password: 'wrong-password',
        }
      end

      it 'returns nil' do
        expect(excute).to be_nil
      end
    end
  end
end
