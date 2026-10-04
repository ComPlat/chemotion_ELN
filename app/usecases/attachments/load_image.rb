# frozen_string_literal: true

module Usecases
  module Attachments
    class LoadImage
      @@types_convert = ['.tif', '.tiff'] # rubocop:disable Style/ClassVars

      # Reads the bytes GET image/:id serves: the annotated image if requested and present,
      # the PNG conversion for a TIFF, else the original file.
      #
      # @param attachment [Attachment]
      # @param annotated [Boolean] serve the annotated image when there is one
      # @return [String] the binary file content
      # @raise [Errors::NotPreviewable] if the attachment is neither an image nor a PDF
      # @raise [Errors::FileMissing] if the stored file is gone
      # @raise [Errors::ConversionFailed] if a TIFF can't be converted to PNG
      def self.execute!(attachment, annotated)
        # to allow reading of PDF files
        raise Errors::NotPreviewable, "no image / PDF attachment: #{attachment.id}" unless attachment.previewable?

        path = if annotated && attachment.annotated?
                 annotated_image_path(attachment)
               elsif attachment.type_image_tiff?
                 converted_image_path(attachment)
               else
                 attachment.attachment.url
               end

        File.binread(path)
      rescue Errno::ENOENT => e
        raise Errors::FileMissing, "file of attachment #{attachment.id} not found: #{e.message}"
      end

      def self.create_converted_image(attachment)
        converter = Usecases::Attachments::Converter::FileConverter.new
        result = converter.create_converted_file(attachment.attachment.url)
        # only the path is kept; close the handle the converter opened
        result[:conversion].close

        update_attachment_data_column(attachment, result)

        # the attacher still holds the derivatives it loaded, so use the converter's path
        File.path(result[:conversion])
      rescue MiniMagick::Error, MiniMagick::Invalid => e
        raise Errors::ConversionFailed, "could not convert attachment #{attachment.id}: #{e.message}"
      end

      def self.update_attachment_data_column(attachment, result)
        # a TIFF stored before derivatives were generated has none yet
        attachment.attachment_data['derivatives'] ||= {}
        attachment.attachment_data['derivatives']['conversion'] = {}
        root_path = attachment.attachment.storage.directory.to_s
        attachment.attachment_data['derivatives']['conversion']['id'] =
          File.path(result[:conversion]).split(root_path).last
        attachment.update_column('attachment_data', attachment.attachment_data) # rubocop:disable Rails/SkipsModelValidations
      end

      def self.annotated_image_path(attachment)
        store = Rails.application.config_for :shrine
        store = store[:store]
        annotated_file_path = "#{store}/#{attachment.attachment_data['derivatives']['annotation']['annotated_file_location'] || 'not available'}" # rubocop:disable Layout/LineLength
        File.file?(annotated_file_path) ? annotated_file_path : attachment.attachment.url
      end

      def self.converted_image_path(attachment)
        return create_converted_image(attachment) unless attachment.attachment_data.dig('derivatives', 'conversion')

        attachment.attachment(:conversion).url
      end
    end
  end
end
