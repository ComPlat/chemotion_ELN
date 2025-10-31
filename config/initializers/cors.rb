# frozen_string_literal: true

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins '*'
    resource '/api/v1/public/*', headers: :any, methods: %i[get post options]
  end
  if ENV['CORS_ALLOWED_ORIGINS'].present?
    allow do
      origins ENV['CORS_ALLOWED_ORIGINS'].split(',').map(&:strip)
      resource '/api/v1/collections/imports/*', headers: :any, methods: %i[post options], credentials: true
    end
  end
end
