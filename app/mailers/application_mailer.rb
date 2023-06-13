# frozen_string_literal: true

class ApplicationMailer < ActionMailer::Base
  default from: ENV['DEVISE_SENDER'] || 'eln'
end
