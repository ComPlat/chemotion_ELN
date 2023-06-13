# frozen_string_literal: true

# a setting in this initializer prevents testing mail deliveries
return if Rails.env.test?

Rails.application.configure do
  uri = URI.parse(config.root_url)
  scheme = uri.scheme
  host   = uri.host
  port   = uri.port

  config.action_mailer.raise_delivery_errors = true if Rails.env.production?
  config.action_mailer.perform_caching = false
  config.action_mailer.default_url_options = { host: host, protocol: scheme, port: port }
  config.action_mailer.delivery_method = :smtp unless Rails.env.test?
  config.action_mailer.smtp_settings = {
    address: ENV.fetch('SMTP_ADDRESS', nil),
    port: ENV.fetch('SMTP_PORT', nil),
    user_name: ENV.fetch('SMTP_USERNAME', nil),
    domain: ENV.fetch('SMTP_DOMAIN', nil),
    password: ENV.fetch('SMTP_PASSWORD', nil),
    authentication: ENV.fetch('SMTP_AUTH', nil) && ENV['SMTP_AUTH'].to_sym,
    enable_starttls_auto: ENV.fetch('SMTP_TLS', nil) && ENV['SMTP_TLS'].include?('true'),
    openssl_verify_mode: ENV.fetch('SMTP_SSL_MODE', nil),
  }

  config.action_mailer.perform_deliveries = false if ENV['SMTP_ADDRESS'].blank? || ENV['DISABLE_MAIL_DELIVERY'].present?
end
