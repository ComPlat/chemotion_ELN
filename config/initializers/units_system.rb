# frozen_string_literal: true

Rails.application.config.after_initialize do
  path = File.join('public', 'units_system')
  File.write(
    File.join(path, 'units_system.json'),
    JSON.pretty_generate({ fields: Labimotion::Units::FIELDS }),
  )
rescue StandardError => e
  Rails.logger.error("Failed to write fields.json: #{e.message}")
end
