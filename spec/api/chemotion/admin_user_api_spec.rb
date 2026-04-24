# frozen_string_literal: true

RSpec.describe Chemotion::AdminUserAPI do
  let!(:admin) { create(:admin) }
  let!(:user) { create(:person) }

  before do
    allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(admin)
  end

  describe 'PUT /api/v1/admin/users/:id/resetPassword' do
    context 'when sending reset instructions (random=false)' do
      it 'returns success and the user email when the mail is delivered' do
        expect_any_instance_of(User).to receive(:send_reset_password_instructions).and_return(true)

        put "/api/v1/admin/users/#{user.id}/resetPassword", params: { random: false }

        expect(response).to have_http_status(:ok)
        expect(parsed_json_response['rp']).to be_truthy
        expect(parsed_json_response['email']).to eq(user.email)
      end

      it 'returns success when SMTP cleanup raises Net::ReadTimeout after delivery' do
        expect_any_instance_of(User).to receive(:send_reset_password_instructions).and_raise(Net::ReadTimeout)

        put "/api/v1/admin/users/#{user.id}/resetPassword", params: { random: false }

        expect(response).to have_http_status(:ok)
        expect(parsed_json_response['rp']).to be_truthy
        expect(parsed_json_response['email']).to eq(user.email)
      end

      xit 'lets unrelated mail-delivery errors propagate' do
        expect_any_instance_of(User).to receive(:send_reset_password_instructions)
          .and_raise(Net::SMTPAuthenticationError, 'bad credentials')

        put "/api/v1/admin/users/#{user.id}/resetPassword", params: { random: false }

        expect(response).not_to have_http_status(:ok)
      end
    end
  end
end
