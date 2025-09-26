class PagesController < ApplicationController
  skip_before_action :authenticate_user!, only: %i[
    home about chemspectra chemspectra_editor
  ]

  def home; end

  def about; end

  def chemspectra; end

  def chemspectra_editor; end

  def docx; end

  def welcome
    flash.clear
  end

  def editor; end

  def styleguide; end

  def sfn_cb
    code = params[:code]
    sf_verifer = request.env.dig('action_dispatch.request.unsigned_session_cookie', 'omniauth.pkce.verifier')
    begin
      provider_authorize = Chemotion::ScifinderNService.provider_authorize(code, sf_verifer)
      sfc = ScifinderNCredential.find_by(created_by: current_user.id)
      ScifinderNCredential.create!(provider_authorize.merge(created_by: current_user.id)) if sfc.blank?
      sfc.update!(provider_authorize) if sfc.present?
      redirect_to root_path
    rescue StandardError
      redirect_to '/500.html'
    end
  end

  def update_user
    @user = current_user

    if params[:reactions_count].present?
      @user.counters['reactions'] = params[:reactions_count].to_i
      @user.reaction_name_prefix = params[:reaction_name_prefix]
    end

    if @user.save
      flash['success'] = 'Settings updated successfully.'
      redirect_to pages_settings_path
    else
      flash.now['danger'] = 'Not saved! Please check input fields.'
      render 'user'
    end
  end

  def profiles
    @profile = current_user&.profile
  end

  def update_profiles
    @profile = current_user.profile
    @profile.assign_attributes(profile_params)

    if @profile.save
      flash['success'] = 'Settings updated successfully.'
      redirect_to pages_settings_path
    else
      flash.now['danger'] = 'Not saved! Please check input fields.'
      render 'profile'
    end
  end

  private

  def profile_params
    params.require(:profile).permit(:show_external_name, :show_sample_name, :show_sample_short_label, :curation)
  end
end
