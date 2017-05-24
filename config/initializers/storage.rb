storage_config = Rails.application.config_for :storage

Rails.application.configure do
  config.storage = ActiveSupport::OrderedOptions.new
  config.storage.stores = storage_config[:stores]
  config.storage.primary_store = storage_config[:primary_store]
  config.storage.secundary_store = storage_config[:secundary_store]
end
