# frozen_string_literal: true

# Deferred to after_initialize so referencing Matrice does not autoload it DURING
# initialization (deprecated in Zeitwerk / error in Rails 7 — DEV_RAILS_UPGRADE_7-0.md §0d).
# config.compute_config is only read at request time (app/api/*), so setting it once
# after boot is equivalent to the previous on_load(:active_record) behaviour.
Rails.application.config.after_initialize do
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
