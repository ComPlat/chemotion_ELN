# frozen_string_literal: true

class TwoFactorAuthMailer < ApplicationMailer
  def enable_mail(user, link)
    @user = user
    @link = link
    subject_text = I18n.t('two_factor_auth_mailer.enable_mail.subject')
    mail(to: @user.email, subject: subject_text) do |format|
      format.html
    end
  end

  def disable_mail(user, link)
    @user = user
    @link = link
    subject_text = I18n.t('two_factor_auth_mailer.disable_mail.subject')
    mail(to: @user.email, subject: subject_text) do |format|
      format.html
    end
  end
end
