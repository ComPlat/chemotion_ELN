# frozen_string_literal: true

class ChemicalExpirationMailer < ApplicationMailer
  def expiration_warning(user, chemical, days_remaining)
    @user = user
    @chemical = chemical
    @days_remaining = days_remaining

    chemical_name = @chemical.chemical_data&.first&.dig('sample_name')
    short_label = @chemical.sample&.short_label

    subject =
      if days_remaining > 0
        "Chemical expires in #{days_remaining} days: #{chemical_name} (#{short_label})"
      elsif days_remaining == 0
        "Chemical expires today: #{chemical_name} (#{short_label})"
      else
        "Chemical expired #{days_remaining.abs} days ago: #{chemical_name} (#{short_label})"
      end

    mail(
      to: @user.email,
      subject: subject
    )
  end
end