# frozen_string_literal: true

module Usecases
  module Attachments
    class LoadImage
      @@types_convert = ['.tif', '.tiff'] # rubocop:disable Style/ClassVars

      def self.execute!(attachment, annotated) # rubocop:disable  Metrics/AbcSize,Metrics/CyclomaticComplexity,Metrics/MethodLength
        raise "no image attachment: #{attachment.id}" unless attachment.image?

        conversion = @@types_convert.include?(attachment.extname)
        return File.read(attachment.attachment.url) unless annotated || conversion
        return File.read(attachment.attachment.url) if annotated && !attachment.annotated?

        attachment_file = get_file_of_converted_image(attachment) if attachment.image_tiff?

        attachment_file = load_annotated_image(attachment, attachment_file) if annotated
        data = nil

        File.open(attachment_file) do |file|
          data = file.read
        end
        data
      end

      def self.create_converted_image(attachment)
        converter = Usecases::Attachments::Converter::FileConverter.new
        result = converter.create_converted_file(attachment.attachment.url)

        update_attachment_data_column(attachment, result)

        File.open(attachment.attachment_attacher.derivatives[:conversion].url)
      end

      def self.update_attachment_data_column(attachment, result)
        attachment.attachment_data['derivatives']['conversion'] = {}
        store = Rails.application.config_for :shrine
        store = store[:store]
        attachment.attachment_data['derivatives']['conversion']['id'] = File.path(result[:conversion]).split(store).last
        attachment.update_column('attachment_data', attachment.attachment_data) # rubocop:disable Rails/SkipsModelValidations
      end

      def self.load_annotated_image(attachment, _attachment_file)
        return File.open(attachment.attachment.url) unless attachment.annotated?

        annotated_file_path = attachment.attachment_data['derivatives']['annotation']['annotated_file_location']
        annotated_file_exists = annotated_file_path && File.file?(annotated_file_path)
        if annotated_file_exists
          File.open(annotated_file_path)
        else
          File.open(attachment.attachment.url)
        end
      end

      def self.get_file_of_converted_image(attachment)
        create_converted_image(attachment) unless attachment.attachment_data['derivatives']['conversion']
        File.open(attachment.attachment_attacher.derivatives[:conversion].url)
      end
    end
  end
end
