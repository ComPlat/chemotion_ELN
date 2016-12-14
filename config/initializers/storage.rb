storage_config = Rails.application.config_for :storage

Rails.application.configure do
  config.storage = ActiveSupport::OrderedOptions.new
  config.storage.root_folder = storage_config[:root_folder]
  config.storage.thumbnail_folder = storage_config[:thumbnail_folder]
  config.storage.temp_folder = storage_config[:temp_folder]
end
