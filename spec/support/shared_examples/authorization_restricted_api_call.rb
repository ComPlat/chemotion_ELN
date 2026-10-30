# frozen_string_literal: true

RSpec.shared_examples 'authorization restricted API call' do
  # subject must be an API call with `headers: authorization_header` and let(:authorization_header) for legit user.
  it_behaves_like 'authenticated API call'

  describe 'unauthorized' do
    let(:authorization_header) { authorized_header(create(:person)) }
    it 'status 404' do
      subject
      expect(response).to have_http_status :not_found
    end
  end
end
