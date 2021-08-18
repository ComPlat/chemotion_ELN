path = Rails.public_path.join('welcome-message.md')
FileUtils.touch path unless File.exist? path
