# frozen_string_literal: true

if File.exist? Rails.root.join('config', 'compute_props.yml')
  compute_config = Rails.application.config_for :compute_props

  Rails.application.configure do
    config.compute_config = ActiveSupport::OrderedOptions.new
    config.compute_config.server = compute_config[:server]
    config.compute_config.hmac_secret = compute_config[:hmac_secret]
    config.compute_config.receiving_secret = compute_config[:receiving_secret]
    config.compute_config.allowed_uids = compute_config[:allowed_uids]
  end
end
