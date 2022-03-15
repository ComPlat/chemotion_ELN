# frozen_string_literal: true

if File.exist? Rails.root.join('config', 'converter.yml')
  converter_config = Rails.application.config_for :converter

  Rails.application.configure do
    config.converter = ActiveSupport::OrderedOptions.new
    config.converter.url = converter_config[:url]
    config.converter.profile = converter_config[:profile]
    config.converter.secret_key = converter_config[:secret_key]
    config.converter.timeout = converter_config[:timeout]
    config.converter.ext = converter_config[:ext]
  end
end
