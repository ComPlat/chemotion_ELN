# frozen_string_literal: true

class SharingNotificationMailer < ApplicationMailer
  default from: "tba"

  def send_mail(user, data)
    mail(to: user.email, subject: "A new collection has been shared with you")
  end
end
