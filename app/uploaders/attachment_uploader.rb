# frozen_string_literal: true

class AttachmentUploader < Shrine
  require 'helpers/annotation/annotation_creator'
  require 'helpers/thumbnail/thumbnail_creator'
  require 'helpers/annotation/mini_magick_image_analyser'
  require 'helpers/derivative_builder_factory'

  MAX_SIZE = Rails.configuration.shrine_storage.maximum_size * 1024 * 1024 # 10 MB
  MAX_FILES_IN_FOLDER = 10_000

  plugin :derivatives
  plugin :keep_files, replaced: true
  plugin :validation_helpers
  plugin :pretty_location
  plugin :remove_attachment
  Attacher.validate do
    validate_max_size MAX_SIZE,
                      message: "File #{record.filename} cannot be uploaded." \
                               'File size must be less than ' \
                               "#{Rails.configuration.shrine_storage.maximum_size} MB"
  end

  def generate_location(io, context = {})
    if context[:record]
      file_name = generate_file_name(io, context)
      bucket = 1
      bucket = (context[:record][:id] / MAX_FILES_IN_FOLDER).floor + 1 if context[:record][:id].present?
      "#{storage.directory}/#{bucket}/#{file_name}"
    else
      super
    end
  end

  # plugins and uploading logic
  Attacher.derivatives do |original|
    file_extension = AttachmentUploader.get_file_extension(file.id)

    file_basename = File.basename(file.metadata['filename'], '.*')

    file_path = AttachmentUploader.create_tmp_file(file_basename, file_extension, file)

    result = AttachmentUploader.create_derivatives(file_extension, file_path, original, @context[:record].id, record)

    result
  end

  def self.create_tmp_file(file_basename, file_extension, file)
    tmp = Tempfile.new([file_basename, file_extension], encoding: 'ascii-8bit')
    tmp.write file.read
    tmp.rewind
    tmp.path
  end

  def self.get_file_extension(file_name)
    file_extension = File.extname(file_name)&.downcase
    file_extension = '.jpg' if file_extension == '.jpeg'

    file_extension
  end

  def self.create_derivatives(file_extension, file_path, original, attachment_id, record)
    result = {}

    factory = DerivativeBuilderFactory.new
    builders = factory.create_derivative_builders(file_extension)
    builders.each do |builder|
      builder.create_derivative(
        file_path.to_s, original, attachment_id, result, record
      )
    end

    result
  end

  def generate_file_name(file_stream, context)
    attachment_key = context[:record][:key]

    file_ending = File.extname(context[:record][:filename])
    file_ending = "#{attachment_key}.thumb.jpg" if file_stream.path.end_with? 'thumb.jpg'
    file_ending = "#{attachment_key}.annotation.svg" if file_stream.path.end_with? 'annotation.svg'

    "#{attachment_key}#{file_ending}"
  end
end
