# frozen_string_literal: true

RSpec.shared_context 'request authorization context', shared_context: :metadata do
  let(:user_email) { 'cu1@test.test' }
  let(:user_name_abbreviation) { 'CU1' }
  let(:user_password) { 'secretpw' }
  let(:username) { user_name_abbreviation }
  let(:password) { user_password }
  let(:user_for_request_specs) do
    create(:user, email: user_email, name_abbreviation: user_name_abbreviation,
                  password: user_password, password_confirmation: user_password)
  end
  let(:user_for_request_specs_payload) do
    {
      user_id: user_for_request_specs.id,
      first_name: user_for_request_specs.first_name,
      last_name: user_for_request_specs.last_name
    }
  end
  let(:authorization_token) { JsonWebToken.encode(user_for_request_specs_payload) }
  let(:authorization_header) { { Authorization: "Bearer #{authorization_token}" } }
end
