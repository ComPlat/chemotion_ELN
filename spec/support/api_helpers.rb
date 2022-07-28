# frozen_string_literal: true

module ApiHelpers
  def parsed_json_response
    JSON.parse(response.body)
  end
end

RSpec.configure do |config|
  config.include ApiHelpers, type: :request
end
