# frozen_string_literal: true

module ApiHelpers
  def parsed_json_response
    JSON.parse(response.body).with_indifferent_access
  end
end

RSpec.configure do |config|
  config.include ApiHelpers, type: :request
end
