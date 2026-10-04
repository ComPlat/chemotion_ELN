# frozen_string_literal: true

# Optional PDF text service for Chemotion::SdsExtractor. The key is always defined, so an
# unconfigured instance reads +url+ as nil and runs Ghostscript locally.
Rails.application.configure do
  config.sds_text_service = ActiveSupport::OrderedOptions.new
  next unless File.exist?(Rails.root.join('config/sds_text_service.yml'))

  settings = config_for(:sds_text_service)
  config.sds_text_service.url = settings[:url].presence
  config.sds_text_service.timeout = settings[:timeout] || 30
end
