# frozen_string_literal: true

RSpec.shared_context 'api request authorization context', shared_context: :metadata do
  let(:user) { create(:person) }
  let(:logged_in_user) { user }

  before do
    allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
  end
end
