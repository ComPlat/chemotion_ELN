# frozen_string_literal: true

Rails.application.config.after_initialize do
  path = Rails.public_path.join('units_system')
  file_path = path.join('units_system.json')
  FileUtils.mkdir_p(path)
  if File.exist?(file_path) && Rails.env.production?
    # keep existing file in production if it already exists thru shared/pullin
  else
    File.write(file_path, JSON.pretty_generate({ fields: Labimotion::Units::FIELDS }))
  end
rescue StandardError => e
  Rails.logger.error("Failed to write units_system.json: #{e.message}")
end
