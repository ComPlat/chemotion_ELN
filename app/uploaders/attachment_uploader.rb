# frozen_string_literal: true

class AttachmentUploader < Shrine
  MAX_SIZE = Rails.configuration.shrine_storage.maximum_size * 1024 * 1024

  plugin :derivatives
  plugin :remove_attachment
  plugin :validation_helpers
  plugin :pretty_location
  plugin :add_metadata
  plugin :determine_mime_type, analyzer: :marcel, analyzer_options: { filename_fallback: true }

  Attacher.validate do
    validate_max_size MAX_SIZE,
                      message: "File #{record.filename} cannot be uploaded. File size must be less than #{Rails.configuration.shrine_storage.maximum_size} MB" # rubocop:disable Layout/LineLength
  end

  def generate_location(io, context = {}) # rubocop:disable Metrics/PerceivedComplexity
    record = context[:record]
    metadata = context[:metadata] || {}

    return super unless record

    filename = metadata['filename'].to_s

    file_name =
      if filename.include?('thumb')
        "#{record.identifier}.thumb.jpg"
      elsif filename.include?('annotation')
        "#{record.identifier}.annotation.svg"
      elsif filename.include?('conversion')
        "#{record.identifier}.conversion.png"
      else
        record.identifier.to_s
      end

    bucket =
      if record.id.present?
        (record.id / 10_000).floor + 1
      else
        1
      end

    "#{bucket}/#{file_name}"
  end # rubocop:enable Metrics/PerceivedComplexity

  # plugins and uploading logic
  add_metadata :md5 do |io|
    calculate_signature(io, :md5)
  end

  Attacher.derivatives do |original|
    file_extension = ".#{record.attachment.mime_type.split('/').last}" unless record.attachment.mime_type.nil?

    file_extension = '.svg' if file_extension == '.svg+xml'

    file_extension = '.jpg' if file_extension == '.jpeg'
    file_extension = '.svg' if file_extension == '.svg+xml'
    file_extension = AttachmentUploader.get_file_extension(original) if file_extension.nil?

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
    "#{context[:record][:identifier]}#{file_ending}"
  end
end
