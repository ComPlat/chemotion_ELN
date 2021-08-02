class CleanUpChunksJob < ApplicationJob
  queue_as :clean_up_chunks_job

  def perform(file_name)
    entries = Dir["#{Rails.root.join('tmp/uploads', 'chunks', file_name)}*"]
    entries.each do |file|
      File.delete(file) if File.exist?(file)
    end
  end
end
