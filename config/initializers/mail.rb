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

  # Accepted OpenSSL certificate check modes. Anything else (an empty value included) is
  # ignored: Mail::SMTP#ssl_context would raise NameError on it.
  smtp_ssl_mode = ENV['SMTP_SSL_MODE'].to_s.downcase
  smtp_ssl_mode = nil unless %w[none peer].include?(smtp_ssl_mode)

  # Fall back to the PUBLIC_URL host as HELO name, but only when it is a hostname: a bare
  # IP is not a valid HELO argument and strict relays reject it.
  smtp_domain = ENV['SMTP_DOMAIN'].presence
  smtp_domain ||= host if host.to_s.include?('.') && !host.to_s.match?(/\A[\d.]+\z/)

  # Blank settings are dropped rather than passed as nil: a nil value overrides the
  # library default instead of falling back to it (Mail::SMTP does DEFAULTS.merge(settings)).
  config.action_mailer.smtp_settings = {
    address: ENV['SMTP_ADDRESS'].presence,
    port: ENV['SMTP_PORT'].presence&.to_i,
    user_name: ENV['SMTP_USERNAME'].presence,
    # HELO domain. Without it the client announces itself as 'localhost', which
    # authenticating relays commonly answer slowly or reject outright.
    domain: smtp_domain,
    password: ENV['SMTP_PASSWORD'].presence,
    authentication: ENV['SMTP_AUTH'].presence&.to_sym,
    enable_starttls_auto: ENV['SMTP_TLS'].presence && ENV['SMTP_TLS'].include?('true'),
    openssl_verify_mode: smtp_ssl_mode,
    # The mail gem defaults both timeouts to 5s, which an authenticated remote relay
    # regularly exceeds (greylisting, recipient verification) - the delivery then fails
    # with Net::ReadTimeout mid-session.
    open_timeout: (ENV['SMTP_OPEN_TIMEOUT'].presence || 10).to_i,
    read_timeout: (ENV['SMTP_READ_TIMEOUT'].presence || 30).to_i,
  }.compact

  config.action_mailer.perform_deliveries = false if ENV['SMTP_ADDRESS'].blank? || ENV['DISABLE_MAIL_DELIVERY'].present?
end
