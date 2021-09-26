# frozen_string_literal: true

namespace :chunks do
  desc 'Clean chunk files'
  task clear: :environment do
    entries = Dir[Rails.root.join('tmp/uploads', 'chunks', '**', '*').to_s]
    entries.each do |file|
      next unless File.exist?(file)

      file_age = (Time.now - File.mtime(file)) / (24 * 3600)
      File.delete(file) if File.exist?(file) && file_age >= 1
    end
  end
end
