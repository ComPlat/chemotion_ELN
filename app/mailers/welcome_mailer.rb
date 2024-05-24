# frozen_string_literal: true

# Mailer to email welcome message to a new ELNer.
require 'redcarpet'
class WelcomeMailer < ApplicationMailer
  def markdown(text)
    @markdown ||= Redcarpet::Markdown.new(Redcarpet::Render::HTML, autolink: true, tables: true)
    @markdown.render(text).html_safe
  end

  def mail_welcome_message(user_id)
    content_path = Rails.public_path.join('welcome-message.md')
    unless File.file?(content_path)
      Rails.logger.info('Not sending Welcome message as file not found')
      return
    end

    @user = User.find(user_id)
    @message = content_path.read
    @output = markdown(@message)

    mail(to: @user.email, subject: '[ELN] Welcome to Chemotion.')
  end

  # set Job max attempts
  def self.max_attempts
    1
  end
end
