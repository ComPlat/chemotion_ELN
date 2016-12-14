storage_config = Rails.application.config_for :storage

Rails.application.configure do
  config.storage = ActiveSupport::OrderedOptions.new
  config.storage.root_folder = storage_config[:root_folder]
end
