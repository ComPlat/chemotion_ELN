# frozen_string_literal: true

# Mailer to email welcome message to a new ELNer.
require 'redcarpet'
class WelcomeMailer < ApplicationMailer
  def markdown(text)
    @markdown ||= Redcarpet::Markdown.new(Redcarpet::Render::HTML, autolink: true, tables: true)
    @markdown.render(text).html_safe
  end

  def mail_welcome_message(user_id)
    @user = User.find(user_id)
    @message = File.read("#{Rails.root}/public/welcome-message.md")
    @output = markdown(@message);

    mail(to: @user.email, subject: "[ELN] Welcome to Chemotion.")
  end
end
