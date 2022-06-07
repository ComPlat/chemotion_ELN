class AttachmentUploader < Shrine
<<<<<<< HEAD
  MAX_SIZE = Rails.configuration.storage.maximum_size * 1024 * 1024 # 10 MB
=======
  # MAX_SIZE = Rails.configuration.storage.maximum_size * 1024 * 1024 # 10 MB
>>>>>>> 1277-using-gemshrine-file-service

  plugin :derivatives
  plugin :keep_files, replaced: true
  plugin :validation_helpers
  plugin :pretty_location
  # Attacher.validate do
  #   validate_max_size MAX_SIZE, message: "File #{record.filename} cannot be uploaded. File size must be less than #{Rails.configuration.storage.maximum_size} MB"
  # end

  def is_integer?
    !!(self =~ /\A[-+]?[0-9]+\z/)
  end

  def generate_location(io, context = {})
    sub_directories = Dir["#{storage.directory}/*"].select { |f| File.directory? f }.sort_by { |s| s.scan(/\d+/).last.to_i }
    if sub_directories.count <= 1
      bucket = 1
    else
      bucket = sub_directories.count - 1
    end
    directory_path = File.join(storage.directory, bucket.to_s)
    file_count = 0
    file_count = Dir.entries(directory_path).select { |f| File.file? File.join(directory_path, f) }.count { |file| !file.split('.').include? 'thumb' } if File.directory?(directory_path)
    bucket = bucket + 1 if file_count > 10_000
    if context[:record]
      file_name = if io.path.include? "thumb.jpg"
                    "#{context[:record][:key]}.thumb.jpg"
                  else
                    "#{context[:record][:key]}#{File.extname(context[:record][:filename])}"
                  end
      "#{storage.directory}/#{bucket}/#{file_name}"
    else
      super
    end
  end

  # plugins and uploading logic
  Attacher.derivatives do |original|
    begin
      file_extension = File.extname(file.id)&.downcase
      file_extension = '.jpg' if file_extension == '.jpeg'
      file_basename = File.basename(file.metadata['filename'], '.*')
      tmp = Tempfile.new([file_basename, file_extension], encoding: 'ascii-8bit')
      tmp.write file.read
      tmp.rewind
      thumbnail = begin
                    Thumbnailer.create(tmp.path)
                  rescue
                    nil
                  end
      result = {}
      if thumbnail.present?
        dir = File.dirname(thumbnail)
        thumb_path = "#{dir}/#{file_basename}.thumb.jpg"
        FileUtils.mkdir_p(dir) unless Dir.exist?(dir)
        FileUtils.move(thumbnail, thumb_path)
        result[:thumbnail] = File.open(thumb_path, 'rb')
        record[:thumb] = true
      end
      result
    ensure
      tmp.close
      tmp.unlink
    end
  end
end