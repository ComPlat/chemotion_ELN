# frozen_string_literal: true

# Expects `user` (persisted, password 'testtest') and `excute` (calls described_class.execute!(params))
# where params are built from `username` and `password`.
RSpec.shared_examples 'a lockable token builder' do
  context 'when the password is wrong' do
    let(:password) { 'wrong-password' }

    it 'returns nil' do
      expect(excute).to be_nil
    end

    it 'increments failed_attempts' do
      expect { excute }.to change { user.reload.failed_attempts }.by(1)
    end

    it 'locks the account after Devise.maximum_attempts failures' do
      Devise.maximum_attempts.times { described_class.execute!(params) }

      expect(user.reload.access_locked?).to be true
    end
  end

  context 'when the password is correct' do
    it 'does not increment failed_attempts' do
      expect { excute }.not_to(change { user.reload.failed_attempts })
    end
  end

  context 'when the account is locked' do
    before { user.lock_access!(send_instructions: false) }

    it 'returns nil even with the correct password' do
      expect(excute).to be_nil
    end
  end

  context 'when the user is not found' do
    let(:username) { 'unknown-user' }

    it 'returns nil' do
      expect(excute).to be_nil
    end
  end
end
