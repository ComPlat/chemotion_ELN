begin
  unless File.exist?(user_config = Rails.root.join('config', 'user_props.yml'))
    FileUtils.cp(Rails.root.join('config', 'user_props.yml.example'), user_config )
  end
  user_props_config = Rails.application.config_for :user_props

  Rails.application.configure do
    config.user_props = ActiveSupport::OrderedOptions.new
    config.user_props.name_abbr = user_props_config[:name_abbreviation] if user_props_config
  end
rescue StandardError => e
  Rails.logger.error e.message
  Rails.application.configure do
    config.editors = nil
  end
end

