# frozen_string_literal: true

# The safety sheet specs run Ghostscript locally unless an example configures the PDF text
# service itself, so a developer's own config/sds_text_service.yml cannot redirect them.
RSpec.configure do |config|
  config.before(:each, file_path: %r{spec/(lib/chemotion/sds_|api/chemotion/chemical_api_spec)}) do
    allow(Rails.configuration).to receive(:sds_text_service).and_return(ActiveSupport::OrderedOptions.new)
  end
end
