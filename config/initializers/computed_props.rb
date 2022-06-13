# frozen_string_literal: true

ActiveSupport.on_load(:active_record) do
  Rails.application.configure do
    begin
      compute_config = ActiveRecord::Base.connection.table_exists?('matrices') ? (Matrice.find_by(name: 'computedProp')&.configs || {}) : {}
    rescue ActiveRecord::StatementInvalid, PG::ConnectionBad, PG::UndefinedTable
      compute_config = {}
    ensure
      config.compute_config = ActiveSupport::OrderedOptions.new
      config.compute_config.server = compute_config['server']
      config.compute_config.hmac_secret = compute_config['hmac_secret']
      config.compute_config.receiving_secret = compute_config['receiving_secret']
      config.compute_config.allowed_uids = compute_config['allowed_uids']
    end
  end
end
