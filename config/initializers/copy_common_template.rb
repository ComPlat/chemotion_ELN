# frozen_string_literal: true

default_file_path = Rails.root.join('uploads', 'common_templates/default.json')
user_file_path = Rails.root.join('uploads', 'common_templates/user.json') # only exists once migrated
destination_path = Rails.root.join('public/json', 'common_templates_list.json')

def valid_json_with_data?(path)
  return false unless File.exist?(path)

  begin
    data = JSON.parse(File.read(path))
    data.is_a?(Array) && data.any?
  rescue JSON::ParserError
    false
  end
end

source_path =
  if valid_json_with_data?(user_file_path)
    user_file_path
  elsif valid_json_with_data?(default_file_path)
    default_file_path
  end

if source_path
  FileUtils.cp(source_path, destination_path)
  Rails.logger.info("Copied #{source_path} to #{destination_path}")
else
  File.write(destination_path, '[]')
  Rails.logger.warn("No valid JSON found. Wrote empty array to #{destination_path}")
end
