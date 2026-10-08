# frozen_string_literal: true

# == Schema Information
#
# Table name: scifinder_n_credentials
#
#  id            :bigint           not null, primary key
#  access_token  :string           not null
#  refresh_token :string
#  expires_at    :datetime         not null
#  created_by    :integer          not null
#  updated_at    :datetime         not null
#
# Indexes
#
#  uni_scifinder_n_credentials  (created_by) UNIQUE
#
require 'rails_helper'

RSpec.describe ScifinderNCredential do
  let(:user) { create(:person) }
  let(:credential) do
    described_class.create!(
      access_token: 'current-access', refresh_token: 'current-refresh', expires_at: expires_at, created_by: user.id,
    )
  end

  describe '#issued_token' do
    before { allow(Chemotion::ScifinderNService).to receive(:provider_access) }

    context 'when the access token is still valid' do
      let(:expires_at) { 1.hour.from_now }

      it 'returns the stored access token without refreshing' do
        expect(credential.issued_token).to eq 'current-access'
        expect(Chemotion::ScifinderNService).not_to have_received(:provider_access)
      end
    end

    context 'when the access token has expired' do
      let(:expires_at) { 1.minute.ago }
      let(:new_expiry) { 2.hours.from_now.change(usec: 0) }

      before do
        allow(Chemotion::ScifinderNService).to receive(:provider_access)
          .and_return(access_token: 'new-access', refresh_token: 'new-refresh', expires_at: new_expiry)
      end

      it 'refreshes using the refresh token' do
        credential.issued_token

        expect(Chemotion::ScifinderNService).to have_received(:provider_access).with('current-refresh')
      end

      it 'returns the new access token' do
        expect(credential.issued_token).to eq 'new-access'
      end

      it 'persists the refreshed credentials' do
        credential.issued_token

        expect(credential.reload).to have_attributes(
          access_token: 'new-access', refresh_token: 'new-refresh', expires_at: new_expiry,
        )
      end
    end

    context 'when refreshing fails' do
      let(:expires_at) { 1.minute.ago }

      before do
        allow(Chemotion::ScifinderNService).to receive(:provider_access).and_raise(StandardError, 'boom')
        allow(Rails.logger).to receive(:error)
      end

      it 'logs the error and keeps the stored credentials' do
        credential.issued_token

        expect(Rails.logger).to have_received(:error).with(/boom/)
        expect(credential.reload).to have_attributes(access_token: 'current-access', refresh_token: 'current-refresh')
      end
    end
  end
end
