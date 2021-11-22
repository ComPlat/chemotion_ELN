class Users::OmniauthController < Devise::OmniauthCallbacksController

  def github
    email = auth_hash.info.email
    first_name = auth_hash.info.name.split[0..-2].join(' ')
    last_name = auth_hash.info.name.split.last

    @user = User.from_omniauth(auth_hash.provider, auth_hash.uid, email, first_name, last_name)

    check_sign_in_and_redirect
  end

  protected

  def check_sign_in_and_redirect
    if @user.persisted?
      sign_in_and_redirect @user, event: :authentication
    else
      session["devise.user_attributes"] = @user.attributes
      redirect_to new_user_registration_url
    end
  end

  def auth_hash
    request.env['omniauth.auth']
  end

end
