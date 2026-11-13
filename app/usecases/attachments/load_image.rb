# frozen_string_literal: true

module Usecases
  module Attachments
    class LoadImage
      @@types_convert = ['.tif', '.tiff'] # rubocop:disable Style/ClassVars

      # What GET image/:id serves: the bytes, and the type and name of the file they come from,
      # which differ from the attachment's own for a converted TIFF or an annotated PNG.
      Image = Struct.new(:data, :content_type, :filename)

      # Loads what GET image/:id serves: the annotated image if requested and present, the PNG
      # conversion for a TIFF, else the original file.
      #
      # @param attachment [Attachment]
      # @param annotated [Boolean] serve the annotated image when there is one
      # @return [Image] the binary content with the content type and filename it is served as
      # @raise [Usecases::Attachments::Errors::NotPreviewable] if the attachment is neither an image nor a PDF
      # @raise [Usecases::Attachments::Errors::FileMissing] if the stored file is gone
      # @raise [Usecases::Attachments::Errors::ConversionFailed] if a TIFF can't be converted to PNG
      def self.read(attachment, annotated: true)
        # to allow reading of PDF files
        unless attachment.previewable?
          raise Usecases::Attachments::Errors::NotPreviewable, "no image / PDF attachment: #{attachment.id}"
        end

        # a missing annotated file falls back to what is served without annotation
        path = (annotated_image_path(attachment) if annotated)
        path ||= attachment.type_image_tiff? ? converted_image_path(attachment) : attachment.attachment.url

        Image.new(File.binread(path), *served_type_and_name(attachment, path))
      rescue Errno::ENOENT => e
        raise Usecases::Attachments::Errors::FileMissing, "file of attachment #{attachment.id} not found: #{e.message}"
      end

      # @return [String] the binary content served by {.read}
      def self.execute!(attachment, annotated: true)
        read(attachment, annotated: annotated).data
      end

      # The original file keeps the attachment's type and name (it may have no extension on
      # disk); a derived file (TIFF conversion, annotated image) is typed and named after its
      # own extension.
      #
      # @return [Array(String, String)] +[content_type, filename]+
      def self.served_type_and_name(attachment, path)
        served_ext = File.extname(path)
        original_ext = File.extname(attachment.filename.to_s)
        if path == attachment.attachment.url || served_ext.casecmp?(original_ext)
          return [attachment.content_type, attachment.filename]
        end

        [Rack::Mime.mime_type(served_ext, attachment.content_type),
         "#{File.basename(attachment.filename.to_s, original_ext)}#{served_ext}"]
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
        raise Usecases::Attachments::Errors::ConversionFailed,
              "could not convert attachment #{attachment.id}: #{e.message}"
      end

      # Records the converted PNG as the +conversion+ derivative. The converter already wrote it
      # where Shrine stores derivatives, so only the entry is written, in the shape Shrine reads
      # back (+id+ relative to the storage directory, +storage+, +metadata+); an entry without
      # +storage+ makes every later load of the attachment's derivatives raise.
      #
      # @param attachment [Attachment]
      # @param result [Hash] the converter result; +:conversion+ is the (closed) PNG file
      def self.update_attachment_data_column(attachment, result)
        path = File.path(result[:conversion])
        root_path = attachment.attachment.storage.directory.to_s
        # a TIFF stored before derivatives were generated has none yet
        attachment.attachment_data['derivatives'] ||= {}
        attachment.attachment_data['derivatives']['conversion'] = {
          'id' => Pathname.new(path).relative_path_from(Pathname.new(root_path)).to_s,
          'storage' => attachment.attachment.storage_key.to_s,
          'metadata' => {
            'filename' => File.basename(path),
            'size' => File.size(path),
            'mime_type' => 'image/png',
          },
        }
        attachment.update_column('attachment_data', attachment.attachment_data) # rubocop:disable Rails/SkipsModelValidations
      end

      # @return [String, nil] the annotated image's path, or nil when there is none on disk
      def self.annotated_image_path(attachment)
        path = attachment.annotated_file_location
        path if path.present? && File.file?(path)
      end

      def self.converted_image_path(attachment)
        return create_converted_image(attachment) unless attachment.attachment_data.dig('derivatives', 'conversion')

        attachment.attachment(:conversion).url
      end
    end
  end
end
