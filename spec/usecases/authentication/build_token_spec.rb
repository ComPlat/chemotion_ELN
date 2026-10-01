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

    context 'when DB auth fails but LDAP succeeds' do
      let(:params) { { username: 'jdoe', password: 'ldap-secret' } }
      let(:ldap_attrs) do
        {
          provider: 'ldap', uid: 'jdoe', email: 'jane.doe@bar.de',
          first_name: 'Jane', last_name: 'Doe', groups: []
        }
      end

      before do
        allow(LdapAuthenticationService).to receive_messages(enabled?: true, authenticate: ldap_attrs)
      end

      it 'auto-provisions the user and returns a token' do
        allow(JsonWebToken).to receive(:encode).and_return('ldap-token')

        expect { expect(excute).to eq('ldap-token') }.to change(User, :count).by(1)
      end

      it 'creates an active person with a unique abbreviation' do
        excute
        provisioned = User.find_by(email: 'jane.doe@bar.de')

        expect(provisioned).to be_present
        expect(provisioned.account_active).to be(true)
        expect(provisioned.name_abbreviation).to be_present
      end
    end

    context 'when LDAP is enabled but the credentials are invalid' do
      let(:params) { { username: 'jdoe', password: 'bad' } }

      before do
        allow(LdapAuthenticationService).to receive_messages(enabled?: true, authenticate: nil)
      end

      it 'returns nil' do
        expect(excute).to be_nil
      end
    end
  end
end
