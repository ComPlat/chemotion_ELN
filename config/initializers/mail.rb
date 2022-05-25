require "uri"

Rails.application.configure do
  uri = URI.parse("#{ENV['HOST_URL'] || 'http://localhost'}")
  scheme = uri.scheme   || 'http'
  host   = uri.host     || 'localhost'
  port   = uri.port     || 80

  config.action_mailer.raise_delivery_errors = true
  config.action_mailer.delivery_method = :smtp
  config.action_mailer.default_url_options = { host: host, protocol: scheme, port: port }
  config.action_mailer.smtp_settings = {
    :address              => ENV["SMTP_ADDRESS"],
    :port                 => ENV["SMTP_PORT"],
    :user_name            => ENV['SMTP_USERNAME'],
    :domain               => ENV['SMTP_DOMAIN'],
    :password             => ENV['SMTP_PASSWORD'],
    :authentication       => ENV['SMTP_AUTH'] && ENV['SMTP_AUTH'].to_sym,
    :enable_starttls_auto => ENV['SMTP_TLS'] && ENV['SMTP_TLS'].match(/true/),
    :openssl_verify_mode  => ENV['SMTP_SSL_MODE']
  }

  if (ENV["SMTP_ADDRESS"] || '').empty? || ENV["DISABLE_MAIL_DELIVERY"].present?
    config.action_mailer.perform_deliveries = false
  end
end

