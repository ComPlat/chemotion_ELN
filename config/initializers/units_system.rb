# frozen_string_literal: true

Rails.application.config.after_initialize do
  path = Rails.public_path.join('units_system', 'units_system.json')
  File.write(path, JSON.pretty_generate({ fields: Labimotion::Units::FIELDS }))
rescue StandardError => e
  Rails.logger.error("Failed to write fields.json: #{e.message}")
end
