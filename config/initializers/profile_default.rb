begin
  profile_default_config = Rails.application.config_for :profile_default

  Rails.application.configure do
    config.profile_default = ActiveSupport::OrderedOptions.new
    config.profile_default.layout = profile_default_config[:layout] if profile_default_config
  end
rescue StandardError => e
  Rails.logger.error e.message
  Rails.application.configure do
    config.editors = nil
  end
end

