# frozen_string_literal: true
# Deferred to after_initialize so referencing Matrice does not autoload it DURING
# initialization (deprecated in Zeitwerk / error in Rails 7 — DEV_RAILS_UPGRADE_7-0.md §0d).
# config.inference is only read at request time, so setting it once after boot is
# equivalent to the previous on_load(:active_record) behaviour.
Rails.application.config.after_initialize do
  Rails.application.configure do
    inference_config = {}

    if File.exist? Rails.root.join('config', 'inference.yml')
      inference_config = Rails.application.config_for :inference
    else
      begin
        inference_config = ActiveRecord::Base.connection.table_exists?('matrices') ? (Matrice.find_by(name: 'reactionPrediction')&.configs&.symbolize_keys || {}) : {}
      rescue ActiveRecord::StatementInvalid, PG::ConnectionBad, PG::UndefinedTable
      end
    end

    config.inference = ActiveSupport::OrderedOptions.new
    config.inference.url = inference_config[:url]
    config.inference.port = inference_config[:port]
  end
end
