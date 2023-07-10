# frozen_string_literal: true

begin
  editors_config = Rails.application.config_for :editors

  Rails.application.configure do
    config.editors = ActiveSupport::OrderedOptions.new
    config.editors.docserver = editors_config[:docserver] if editors_config
    config.editors.info = editors_config[:info] if editors_config
    location = URI.join(editors_config[:docserver][:uri], editors_config[:docserver][:api])
    if location.is_a?(URI::HTTP)
      config.editors.docserver_api = location.to_s
    else
      config.editors = nil
    end
    available_extensions = config.editors.docserver&.fetch(:ext, [])&.flatten(2)&.filter { |ext| ext.is_a?(String) }
    config.editors.available_extensions = available_extensions
  end

rescue StandardError => e
  Rails.logger.error e.message
  Rails.application.configure do
    config.editors = nil
  end
end
