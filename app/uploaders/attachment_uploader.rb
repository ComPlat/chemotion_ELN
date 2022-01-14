# frozen_string_literal: true

class AttachmentUploader < Shrine
  MAX_SIZE = Rails.configuration.shrine_storage.maximum_size * 1024 * 1024 # 10 MB

  plugin :derivatives
  plugin :keep_files, replaced: true
  plugin :validation_helpers
  plugin :pretty_location
  Attacher.validate do
    validate_max_size MAX_SIZE, message: "File #{record.filename} cannot be uploaded. File size must be less than #{Rails.configuration.shrine_storage.maximum_size} MB"
  end

  def is_integer?
    !!(self =~ /\A[-+]?[0-9]+\z/)
  end

  def generate_location(io, context = {})
    if context[:record]
      file_name = if io.path.include? 'thumb.jpg'
                    "#{context[:record][:key]}.thumb.jpg"
                  else
                    "#{context[:record][:key]}#{File.extname(context[:record][:filename])}"
                  end

      bucket = 1
      bucket = (context[:record][:id] / 10_000).floor + 1 if context[:record][:id].present?
      "#{storage.directory}/#{bucket}/#{file_name}"
    else
      super
    end
  end

  # plugins and uploading logic
  Attacher.derivatives do |_original|
    file_extension = File.extname(file.id)&.downcase
    file_path = _original.path
    if file_extension == '.jpeg'
      file_extension = '.jpg'
      file_basename = File.basename(file.metadata['filename'], '.*')
      tmp = Tempfile.new([file_basename, file_extension], encoding: 'ascii-8bit')
      tmp.write file.read
      tmp.rewind
      file_path = tmp.path
    end

    thumbnail = begin
                  Thumbnailer.create(file_path)
                rescue StandardError
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
    if tmp.present?
      tmp.close
      tmp.unlink
    end
  end
end
