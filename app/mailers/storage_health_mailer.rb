# frozen_string_literal: true

class StorageHealthMailer < ApplicationMailer
  def unavailable(problems)
    @problems = problems
    admins = Admin.pluck(:email)
    return if admins.empty?

    mail(to: admins, subject: 'Chemotion: a file storage tier is unavailable') # rubocop:disable Rails/I18nLocaleTexts
  end
end
