# frozen_string_literal: true

require 'image_processing/mini_magick'

module Usecases
  module Attachments
    module Thumbnail
      # Renders a square JPEG thumbnail from an image or PDF file using ImageProcessing (MiniMagick).
      class ThumbnailGenerator
        SIZE = 800 # px
        PDF_RENDER_DPI = 200
        QUALITY = 75

        IMAGE_FORMATS = %w[jpg jpeg png tif tiff bmp gif eps ps svg pnm ico psd].freeze
        PDF_FORMATS = %w[pdf].freeze

        class << self
          def supported_formats
            IMAGE_FORMATS + PDF_FORMATS
          end

          # Returns the path to a generated JPEG thumbnail, or nil if unsupported/unrenderable.
          def create(file)
            return nil unless valid_source?(file)

            ext = File.extname(file).sub(/^\./, '').downcase
            return nil unless supported_formats.include?(ext)

            render(file, ext)
          rescue StandardError => e
            Rails.logger.error("ThumbnailGenerator failed for #{file}: #{e.message}")
            nil
          end

          private

          def valid_source?(file)
            file.is_a?(String) && File.exist?(file) && File.size(file) > 1000
          end

          def render(file, ext)
            destination = File.join(Dir.mktmpdir, "#{SecureRandom.hex(8)}.thumb.jpg")

            pipeline = ImageProcessing::MiniMagick.source(file).convert('jpg')
            pipeline = pipeline.loader(page: 0, density: PDF_RENDER_DPI) if PDF_FORMATS.include?(ext)
            pipeline
              .resize_and_pad(SIZE, SIZE, background: 'white')
              .saver(quality: QUALITY)
              .call(destination: destination)

            File.exist?(destination) ? destination : nil
          end
        end
      end
    end
  end
end
