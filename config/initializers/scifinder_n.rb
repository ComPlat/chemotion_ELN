# frozen_string_literal: true
sfn_config = {}

if File.exist? Rails.root.join('config', 'scifinder_n.yml')
  sfn_config = Rails.application.config_for :scifinder_n
  Rails.application.configure do
    config.sfn_config = ActiveSupport::OrderedOptions.new
    config.sfn_config.provider = sfn_config[:provider]
  end
  Chemotion::ScifinderNService.provider_builder
end
