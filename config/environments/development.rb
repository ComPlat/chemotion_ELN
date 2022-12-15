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

  # config.action_mailer.perform_caching = false

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
  # config.file_watcher = ActiveSupport::EventedFileUpdateChecker

  # to allow development on M1 based Macs, use a simpler FileWatcher that does not rely on inotify (which does
  # currently not work with docker on M1 macs as the used qemu backend does not support inotify).
  # see https://github.com/evilmartians/terraforming-rails/issues/34#issuecomment-1347442704
  config.file_watcher = ActiveSupport::FileUpdateChecker

  # Stop the development & test logs from taking up to much space
  # https://stackoverflow.com/questions/7784057/ruby-on-rails-log-file-size-too-large/37499682#37499682
  config.logger = ActiveSupport::Logger.new(config.paths['log'].first, 1, 50.megabytes)
end
