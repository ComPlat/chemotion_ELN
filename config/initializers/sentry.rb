# frozen_string_literal: true

Sentry.init do |config|
  config.dsn = ENV['SENTRY_BACKEND_DSN']
  config.breadcrumbs_logger = %i[active_support_logger http_logger]

  # Set tracesSampleRate to 1.0 to capture 100%
  # of transactions for performance monitoring.
  # We recommend adjusting this value in production
  config.traces_sample_rate = ENV['SENTRY_BACKEND_SAMPLE_RATE'].to_f
end
