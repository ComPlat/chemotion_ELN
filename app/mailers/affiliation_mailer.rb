# frozen_string_literal: true

class AffiliationMailer < ApplicationMailer
  # Takes an id: the user may withdraw (delete) the suggestion before this job runs.
  def suggestion_submitted(suggestion_id)
    @suggestion = AffiliationSuggestion.find_by(id: suggestion_id)
    return unless @suggestion

    @user = @suggestion.user
    recipients = (Admin.pluck(:email) + moderator_emails).compact.uniq
    return if recipients.empty?

    mail(bcc: recipients,
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
         subject: '[ELN] Your affiliation suggestion has been approved', # rubocop:disable Rails/I18nLocaleTexts
         template_name: 'suggestion') do |format|
      format.html
      format.text
    end
  end

  def suggestion_rejected(suggestion)
    @suggestion = suggestion
    @user = suggestion.user
    mail(to: @user.email,
         subject: '[ELN] Your affiliation suggestion was not approved', # rubocop:disable Rails/I18nLocaleTexts
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
