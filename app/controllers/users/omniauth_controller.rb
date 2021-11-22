class Users::OmniauthController < Devise::OmniauthCallbacksController

  def github
    if user_signed_in?
      current_user.link_omniauth(auth.provider, auth.uid)
      redirect_to '/users/edit'
    else
      email = auth.info.email
      first_name = auth.info.name.split[0..-2].join(' ')
      last_name = auth.info.name.split.last

      @user = User.from_omniauth(auth.provider, auth.uid, email, first_name, last_name)

      if @user.persisted?
        sign_in_and_redirect @user, event: :authentication
      else
        session['devise.omniauth.data'] = {
          :provider => auth.provider,
          :uid => auth.uid,
          :email => email,
          :first_name => first_name,
          :last_name => last_name
        }
        redirect_to new_user_registration_url
      end
    end
  end

  def orcid
    if user_signed_in?
      current_user.link_omniauth(auth.provider, auth.uid)
      redirect_to '/users/edit'
    else
      @user = User.from_omniauth(auth.provider, auth.uid, auth.info.email, auth.info.first_name, auth.info.last_name)

      if @user.persisted?
        sign_in_and_redirect @user, event: :authentication
      else
        affiliation = auth.info.employments[0]
        session['devise.omniauth.data'] = {
          :provider => auth.provider,
          :uid => auth.uid,
          :email => auth.info.email,
          :first_name => auth.info.first_name,
          :last_name => auth.info.last_name,
          :affiliation => affiliation
        }
        redirect_to new_user_registration_url
      end
    end
  end

  protected

  def auth
    request.env['omniauth.auth']
  end

end
