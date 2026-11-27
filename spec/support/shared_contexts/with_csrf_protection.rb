# frozen_string_literal: true

# Forgery protection is disabled in the test environment (config/environments/test.rb).
# This context switches it on and provides helpers that behave like the frontend:
# take the CSRF token from the X-CSRF-Token response header and send it back as header.
RSpec.shared_context 'with CSRF protection' do
  around do |example|
    ActionController::Base.allow_forgery_protection = true
    example.run
  ensure
    ActionController::Base.allow_forgery_protection = false
  end

  def csrf_token_from_response
    response.headers['X-CSRF-Token']
  end

  # Loads a page like the browser does and returns the token the page would contain.
  def fetch_csrf_token
    get '/home'
    csrf_token_from_response
  end

  # Signs in via the JSON login of the frontend and returns the rotated CSRF token.
  def sign_in_with_csrf(user, password: 'testtest')
    post '/users/sign_in',
         params: { user: { login: user.name_abbreviation, password: password } },
         headers: { 'X-CSRF-Token' => fetch_csrf_token },
         as: :json
    raise "sign in failed: #{response.status} #{response.body}" unless response.status == 200

    csrf_token_from_response
  end
end
