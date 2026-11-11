# frozen_string_literal: true

class ChemicalExpirationNotificationJob < ApplicationJob
  def perform
    today = Date.current

    Chemical.find_each do |chemical|
      expiration_date = chemical.chemical_data&.first&.dig('expiration_date')
      next if expiration_date.blank?

      expiration_date = Date.strptime(expiration_date, '%d.%m.%Y')
      days_remaining = (expiration_date - today).to_i

      next if days_remaining > 30

      user = chemical.sample&.user

      next if user.nil? || user.email.blank?

      puts "Chemical #{chemical.id}: #{days_remaining} days remaining → #{user.email}"

      ChemicalExpirationMailer
        .expiration_warning(user, chemical, days_remaining)
        .deliver_now
    end
  end
end
