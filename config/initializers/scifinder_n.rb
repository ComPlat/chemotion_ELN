# frozen_string_literal: true
sfn_config = {}

if File.exist? Rails.root.join('config', 'scifinder_n.yml')
  sfn_config = Rails.application.config_for :scifinder_n
  Rails.application.configure do
    config.sfn_config = ActiveSupport::OrderedOptions.new
    config.sfn_config.provider = sfn_config[:provider]
  end
  # the service is autoloaded: build the provider once the application is initialized
  Rails.application.config.after_initialize do
    Chemotion::ScifinderNService.provider_builder
  end
end
