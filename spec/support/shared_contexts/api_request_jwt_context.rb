# frozen_string_literal: true

RSpec.shared_context 'api request jwt context', shared_context: :metadata do
  let(:jwt_user) { create(:person) }
  let(:jwt_payload) do
    {
      user_id: jwt_user.id,
      first_name: jwt_user.first_name,
      last_name: jwt_user.last_name
    }
  end
  let(:jwt_token) do
    JsonWebToken.encode(jwt_payload)
  end
  let(:jwt_request_header) do
    {'Authorization': "Bearer #{jwt_token}"}
  end

  before do
    allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(nil)
  end
end
