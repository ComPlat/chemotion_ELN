# frozen_string_literal: true

class TwoFactorAuthMailer < ApplicationMailer
  def enable_mail(user, link, expire_at)
    @user = user
    @expire_at = expire_at
    @link = link
    mail(to: @user.email, subject: "[ELN] Enable 2FA") do |format|
      format.html
    end
  end
  def disable_mail(user, link)
    @user = user
    @link = link
    mail(to: @user.email, subject: "[ELN] Disable 2FA") do |format|
      format.html
    end
  end
end
