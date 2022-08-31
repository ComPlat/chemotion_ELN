storage_config = Rails.application.config_for :storage

Rails.application.configure do
  config.storage = ActiveSupport::OrderedOptions.new
  config.storage.stores = storage_config[:stores]
  config.storage.primary_store = storage_config[:primary_store]
  config.storage.secondary_store = storage_config[:secondary_store]
  config.storage.maximum_size = storage_config[:maximum_size]
end
