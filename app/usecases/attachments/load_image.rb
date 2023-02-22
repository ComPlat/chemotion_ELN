# frozen_string_literal: true

module Usecases
  module Attachments
    class LoadImage
      @@types_convert = ['.tif', '.tiff'] # rubocop:disable Style/ClassVars

      def self.execute!(attachment, annotated)
        raise "no image attachment: #{attachment.id}" unless attachment.content_type.start_with?('image')

        attachment_file = File.open(attachment.attachment_data['id'])

        attachment_file = get_file_of_converted_image(attachment) if @@types_convert.include?(attachment.extname)

        attachment_file = load_annotated_image(attachment, attachment_file) if annotated

        data = attachment_file.read
        attachment_file.close

        data
      end

      def self.create_converted_image(attachment)
        converter = Usecases::Attachments::Converter::FileConverter.new
        result = converter.create_converted_file(attachment.attachment_data['id'])

        update_attachment_data_column(attachment, result)

        File.open(attachment.attachment_data['derivatives']['conversion']['id'])
      end

      def self.update_attachment_data_column(attachment, result)
        attachment.attachment_data['derivatives']['conversion'] = {}
        attachment.attachment_data['derivatives']['conversion']['id'] = File.path(result[:conversion])
        attachment.update_column('attachment_data', attachment.attachment_data) # rubocop:disable Rails/SkipsModelValidations
      end

      def self.load_annotated_image(attachment, attachment_file)
        return attachment_file if attachment.attachment_data['derivatives']['annotation'] == nil
        annotated_file_path = attachment.attachment_data['derivatives']['annotation']['annotated_file_location']
        annotated_file_exists = annotated_file_path && File.exist?(annotated_file_path)
        if annotated_file_exists
          File.open(annotated_file_path)
        else
          attachment_file
        end
      end

      def self.get_file_of_converted_image(attachment)
        create_converted_image(attachment) unless attachment.attachment_data['derivatives']['conversion']
        File.open(attachment.attachment_data['derivatives']['conversion']['id'])
      end
    end
  end
end
