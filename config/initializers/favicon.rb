# frozen_string_literal: true

# copy favicon if not present in app
favicon_example_file = Rails.public_path.join('favicon.ico.example')
begin
  favicon_file = Rails.public_path.join('favicon.ico')
  `cp #{favicon_example_file} #{favicon_file}` unless File.exist?(favicon_file)
  favicon_file = Rails.public_path.join('images', 'favicon.ico')
  `cp #{favicon_example_file} #{favicon_file}` unless File.exist?(favicon_file)
rescue
end



