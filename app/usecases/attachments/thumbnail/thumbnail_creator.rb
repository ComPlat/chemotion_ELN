# frozen_string_literal: true

# Class for creating thumbnails. It must fulfill the contract of the "virtual" interface for creating derivatives:
# create_derivative(tmpPath,originalFile,dbId,result,record)
# Rendering is delegated to ThumbnailGenerator.

module Usecases
  module Attachments
    module Thumbnail
      class ThumbnailCreator
        def create_derivative(tmp_path, _, _, result, record)
          begin
            thumbnail = ThumbnailGenerator.create(tmp_path)
            add_thumbnail_to_record(thumbnail, record, result) if thumbnail.present?
          rescue StandardError => e
            Rails.logger.info('**** ThumbnailCreator failed ***')
            Rails.logger.error e
          end

          result
        end

        def add_thumbnail_to_record(thumbnail, record, result)
          dir = File.dirname(thumbnail)
          thumb_path = "#{dir}/#{record.identifier}.thumb.jpg"
          FileUtils.mkdir_p(dir)
          FileUtils.move(thumbnail, thumb_path)
          result[:thumbnail] = File.open(thumb_path, 'rb')
          record.thumb = true
        end

        def self.supported_formats
          ThumbnailGenerator.supported_formats
        end
      end
    end
  end
end
