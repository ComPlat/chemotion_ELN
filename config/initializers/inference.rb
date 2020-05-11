# frozen_string_literal: true

if File.exist? Rails.root.join('config', 'inference.yml')
  inference_config = Rails.application.config_for :inference

  Rails.application.configure do
    config.inference = ActiveSupport::OrderedOptions.new
    config.inference.products = inference_config[:products]
  end
end
