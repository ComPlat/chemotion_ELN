# frozen_string_literal: true

# Class for creating thumbnails. It must fulfill the contract of the "virtual" interface for creating derivatives:
# create_derivative(tmpPath,originalFile,dbId,result,record)
# Currently we use the thumbnailer library
# https://github.com/merlin-p/thumbnailer.git

class ThumbnailCreator
  def create_derivative(tmp_path, _, _, result, record)
    begin
      thumbnail = Thumbnailer.create(tmp_path)

      if thumbnail.present?
        dir = File.dirname(thumbnail)
        thumb_path = "#{dir}/#{record.identifier}.thumb.jpg"
        FileUtils.mkdir_p(dir) unless Dir.exist?(dir)
        FileUtils.move(thumbnail, thumb_path)
        result[:thumbnail] = File.open(thumb_path, 'rb')
        record.thumb = true
      end
    rescue StandardError => e
      Rails.logger.info('**** ThumbnailCreator failed ***')
      Rails.logger.error e
    end

    result
  end
end
