# frozen_string_literal: true

module ApiHelpers
  def parsed_json_response
    parsed_response = JSON.parse(response.body)
    parsed_response.is_a?(Hash) ? parsed_response.with_indifferent_access : parsed_response
  end
end

RSpec.configure do |config|
  config.include ApiHelpers, type: :request
end
