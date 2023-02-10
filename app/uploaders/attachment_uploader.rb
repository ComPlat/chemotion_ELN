# frozen_string_literal: true

class AttachmentUploader < Shrine
  MAX_SIZE = Rails.configuration.shrine_storage.maximum_size * 1024 * 1024

  plugin :derivatives
  plugin :remove_attachment
  plugin :validation_helpers
  plugin :pretty_location
  Attacher.validate do
    validate_max_size MAX_SIZE,
                      message: "File #{record.filename} cannot be uploaded. File size must be less than #{Rails.configuration.shrine_storage.maximum_size} MB" # rubocop:disable Layout/LineLength
  end

  def generate_location(io, context = {}) # rubocop:disable Metrics/AbcSize,Metrics/MethodLength
    if context[:record]
      file_name = if io.path.include? 'thumb.jpg'
                    "#{context[:record][:key]}.thumb.jpg"
                  elsif io.path.include? 'annotation.svg'
                    "#{context[:record][:key]}.annotation.svg"
                  elsif io.path.include? 'conversion.png'
                    "#{context[:record][:key]}.conversion.png"
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
    factory = Usecases::Attachments::DerivativeBuilderFactory.new
    builders = factory.create_derivative_builders(file_extension)
    builders.each do |builder|
      builder.create_derivative(
        file_path.to_s, original, attachment_id, result, record
      )
    end

    result
  end

  def generate_file_name(file_stream, context)
    file_ending = File.extname(context[:record][:filename])
    file_ending = '.thumb.jpg' if file_stream.path.include? 'thumb.jpg'
    file_ending = '.annotation.svg' if file_stream.path.include? 'annotation.svg'
    file_ending = '.conversion.png' if file_stream.path.include? 'conversion.png'
    "#{context[:record][:key]}#{file_ending}"
  end
end
