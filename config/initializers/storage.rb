storage_config = Rails.application.config_for :storage

Rails.application.configure do
  config.storage = ActiveSupport::OrderedOptions.new
  config.storage.root_folder = storage_config[:root_folder]
  config.storage.thumbnail_folder = storage_config[:thumbnail_folder]
  config.storage.temp_folder = storage_config[:temp_folder]

  config.storage.remote_enable = storage_config[:remote_enable]
  config.storage.host = storage_config[:host]
  config.storage.username = storage_config[:username]
  config.storage.password = storage_config[:password]
end
