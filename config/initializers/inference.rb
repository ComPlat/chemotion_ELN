# frozen_string_literal: true
ActiveSupport.on_load(:active_record) do
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
