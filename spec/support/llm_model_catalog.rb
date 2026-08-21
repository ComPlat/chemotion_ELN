# frozen_string_literal: true

# Rails.cache is a FileStore in the test environment, so anything LlmModelCatalog
# writes lands in tmp/cache and survives both the example and the whole rspec run.
# Without this, a spec that lists provider models would leak its catalogue into
# every later example — and into the next run on the same machine — making
# request specs quietly order- and history-dependent.
RSpec.configure do |config|
  config.before { LlmModelCatalog.clear! }
end
