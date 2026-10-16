# frozen_string_literal: true

# A fresh store per example: Rails.cache here is a FileStore under tmp/cache, shared
# across examples, runs and parallel processes, and slow to clear.
RSpec.configure do |config|
  config.before { LlmModelCatalog.instance_variable_set(:@store, ActiveSupport::Cache::MemoryStore.new) }
end
