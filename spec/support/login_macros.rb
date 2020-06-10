# frozen_string_literal: true

module LoginMacros
  def sign_in(user)
    visit root_path
    fill_in 'user_login', with: user.login
    fill_in 'user_password', with: user.password
    find('button[type="submit"]').click
  end
end
