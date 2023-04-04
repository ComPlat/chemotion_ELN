# frozen_string_literal: true

module Usecases
  module Attachments
    class LoadImage
      @@types_convert = ['.tif', '.tiff'] # rubocop:disable Style/ClassVars

      def self.execute!(attachment, annotated) # rubocop:disable  Metrics/PerceivedComplexity
        # to allow reading of PDF files
        raise "no image / PDF attachment: #{attachment.id}" unless attachment.type_image? || attachment.type_pdf?

        conversion = attachment.type_image_tiff?

        attachment_file = if annotated
                            if attachment.annotated?
                              load_annotated_image(attachment, attachment_file)
                            elsif conversion
                              get_file_of_converted_image(attachment)
                            else
                              File.open(attachment.attachment.url)
                            end
                          elsif conversion
                            get_file_of_converted_image(attachment)
                          else
                            File.open(attachment.attachment.url)
                          end

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

        File.open(attachment.attachment(:conversion).url)
      end

      def self.update_attachment_data_column(attachment, result)
        attachment.attachment_data['derivatives']['conversion'] = {}
        root_path = attachment.attachment.storage.directory.to_s
        attachment.attachment_data['derivatives']['conversion']['id'] =
          File.path(result[:conversion]).split(root_path).last
        attachment.update_column('attachment_data', attachment.attachment_data) # rubocop:disable Rails/SkipsModelValidations
      end

      def self.load_annotated_image(attachment, _attachment_file)
        return File.open(attachment.attachment.url) unless attachment.annotated?

        store = Rails.application.config_for :shrine
        store = store[:store]
        annotated_file_path = "#{store}/#{attachment.attachment_data['derivatives']['annotation']['annotated_file_location'] || 'not available'}" # rubocop:disable Layout/LineLength
        annotated_file_exists = annotated_file_path && File.file?(annotated_file_path)
        if annotated_file_exists
          File.open(annotated_file_path)
        else
          File.open(attachment.attachment.url)
        end
      end

      def self.get_file_of_converted_image(attachment)
        create_converted_image(attachment) unless attachment.attachment_data['derivatives']['conversion']
        File.open(attachment.attachment(:conversion).url)
      end
    end
  end
end
