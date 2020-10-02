# frozen_string_literal: true

if File.exist? Rails.root.join('config', 'inference.yml')
  inference_config = Rails.application.config_for :inference

  Rails.application.configure do
    config.inference = ActiveSupport::OrderedOptions.new
    config.inference.url = inference_config[:url]
    config.inference.port = inference_config[:port]
  end
end
