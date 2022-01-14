shrine_storage = Rails.application.config_for :shrine_config

Rails.application.configure do
  config.shrine_storage = ActiveSupport::OrderedOptions.new
  config.shrine_storage.store = shrine_storage[:store]
  config.shrine_storage.cache = shrine_storage[:cache]
  config.shrine_storage.maximum_size = shrine_storage[:maximum_size]
end
