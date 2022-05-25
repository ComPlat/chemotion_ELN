require "uri"

Rails.application.configure do
  # Settings specified here will take precedence over those in config/application.rb.

  # In the development environment your application's code is reloaded on
  # every request. This slows down response time but is perfect for development
  # since you don't have to restart the web server when you make code changes.
  config.cache_classes = false

  # Do not eager load code on boot.
  config.eager_load = false

  # Show full error reports.
  config.consider_all_requests_local = true

  # Enable/disable caching. By default caching is disabled.
  # Run rails dev:cache to toggle caching.
  if Rails.root.join('tmp', 'caching-dev.txt').exist?
    config.action_controller.perform_caching = true

    config.cache_store = :memory_store
    config.public_file_server.headers = {
      'Cache-Control' => "public, max-age=#{2.days.to_i}"
    }
  else
    config.action_controller.perform_caching = false

    config.cache_store = :null_store
  end

  # Store uploaded files on the local file system (see config/storage.yml for options)
  # config.active_storage.service = :local

  # Don't care if the mailer can't send.
  config.action_mailer.raise_delivery_errors = false

  config.action_mailer.perform_caching = false

  # Print deprecation notices to the Rails logger.
  config.active_support.deprecation = :log

  # Raise an error on page load if there are pending migrations.
  config.active_record.migration_error = :page_load

  # Highlight code that triggered database queries in logs.
  config.active_record.verbose_query_logs = true

  # Debug mode disables concatenation and preprocessing of assets.
  # This option may cause significant delays in view rendering with a large
  # number of complex assets.
  config.assets.debug = true

  # Suppress logger output for asset requests.
  config.assets.quiet = true

  # Raises error for missing translations
  # config.action_view.raise_on_missing_translations = true

  uri = URI.parse("#{ENV['HOST_URL'] || 'http://localhost'}")
  scheme = uri.scheme   || 'http'
  host   = uri.host     || 'localhost'
  port   = uri.port     || 80

  config.action_mailer.raise_delivery_errors = true
  config.action_mailer.delivery_method = :smtp
  config.action_mailer.default_url_options = { host: host, protocol: scheme, port: port }
  config.action_mailer.smtp_settings = {
    :address              => ENV["SMTP_ADDRESS"] || "localhost",
    :port                 => ENV["SMTP_PORT"] || 1025,
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

#  TurboSprockets.configure do |config|
#    config.precompiler.enabled = false
#    config.preloader.enabled = false
#    config.preloader.worker_count = 3
#    config.precompiler.worker_count = 3
#  end

  config.after_initialize do
    Bullet.enable = true
    Bullet.alert = true
    Bullet.bullet_logger = true
    Bullet.console = true
#    Bullet.rails_logger = true
    Bullet.add_footer = true
  end

  # Use an evented file watcher to asynchronously detect changes in source code,
  # routes, locales, etc. This feature depends on the listen gem.
  config.file_watcher = ActiveSupport::EventedFileUpdateChecker
end
