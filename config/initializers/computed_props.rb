# frozen_string_literal: true

begin
  compute_config = Matrice.find_by(name: 'computedProp')&.configs || {}
rescue ActiveRecord::StatementInvalid, PG::ConnectionBad, PG::UndefinedTable
  compute_config = {}
ensure
  Rails.application.configure do
    config.compute_config = ActiveSupport::OrderedOptions.new
    config.compute_config.server = compute_config[:server]
    config.compute_config.hmac_secret = compute_config[:hmac_secret]
    config.compute_config.receiving_secret = compute_config[:receiving_secret]
    config.compute_config.allowed_uids = compute_config[:allowed_uids]
  end
end
