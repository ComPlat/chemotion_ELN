# frozen_string_literal: true

# rubocop:disable Rails/I18nLocaleTexts
class AffiliationMailer < ApplicationMailer
  def suggestion_submitted(suggestion)
    @suggestion = suggestion
    @user = suggestion.user
    recipients = (Admin.pluck(:email) + moderator_emails).compact.uniq
    return if recipients.empty?

    mail(to: recipients,
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

  private

  def moderator_emails
    User.joins(:profile).where("profiles.data ->> 'affiliation_moderator' = 'true'").pluck(:email)
  end
end
# rubocop:enable Rails/I18nLocaleTexts
