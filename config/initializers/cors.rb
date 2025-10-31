# frozen_string_literal: true

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins '*'
    resource '/api/v1/public/*', headers: :any, methods: %i[get post options]
    resource '/api/v1/collections/imports/*', headers: :any, methods: %i[post options], credentials: false
  end
end
