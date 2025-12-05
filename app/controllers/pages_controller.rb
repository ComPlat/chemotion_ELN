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

  def sfn_cb
    code = params[:code]
    sf_verifer = request.env.dig('action_dispatch.request.unsigned_session_cookie', 'omniauth.pkce.verifier')
    begin
      provider_authorize = Chemotion::ScifinderNService.provider_authorize(code, sf_verifer)
      sfc = ScifinderNCredential.find_by(created_by: current_user.id)
      ScifinderNCredential.create!(provider_authorize.merge(created_by: current_user.id)) if sfc.blank?
      sfc.update!(provider_authorize) if sfc.present?
      redirect_to pages_settings_path
    rescue StandardError
      redirect_to '/500.html'
    end
  end
end
