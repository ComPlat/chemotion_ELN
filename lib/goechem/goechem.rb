# frozen_string_literal: true

# Namespace and configuration for the GoeChem inventory integration.
# Credentials come from the environment (set them in the gitignored .env):
#   GOECHEM_BASE_URL — GoeChem instance, e.g. https://02.goechem.de
#   GOECHEM_API_KEY  — REST API key issued by the GoeChem admins
module GoeChem
  BASE_URL = ENV.fetch('GOECHEM_BASE_URL', nil)
  API_KEY  = ENV.fetch('GOECHEM_API_KEY', nil)

  # Non-2xx response from the GoeChem API
  class ApiError < StandardError; end
  # Network-level failure (timeout, DNS, missing configuration)
  class ConnectionError < StandardError; end
end
