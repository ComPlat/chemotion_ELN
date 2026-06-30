# frozen_string_literal: true

# rubocop:disable Rails/I18nLocaleTexts
class AffiliationMailer < ApplicationMailer
  def suggestion_submitted(suggestion)
    @suggestion = suggestion
    @user = suggestion.user
    mail(to: Admin.pluck(:email),
         subject: "New affiliation suggestion from #{@user.name}",
         template_name: 'suggestion') do |format|
      format.html
      format.text
    end
  end

  def suggestion_approved(suggestion)
    @suggestion = suggestion
    @user = suggestion.user
    mail(to: @user.email,
         subject: '[ELN] Your affiliation suggestion has been approved',
         template_name: 'suggestion') do |format|
      format.html
      format.text
    end
  end

  def suggestion_rejected(suggestion)
    @suggestion = suggestion
    @user = suggestion.user
    mail(to: @user.email,
         subject: '[ELN] Your affiliation suggestion was not approved',
         template_name: 'suggestion') do |format|
      format.html
      format.text
    end
  end
end
# rubocop:enable Rails/I18nLocaleTexts
