# frozen_string_literal: true

# Class for creating thumbnails. It must fulfill the contract of the "virtual" interface for creating derivatives:
# create_derivative(tmpPath,originalFile,dbId,result,record)
<<<<<<< HEAD
# Currently we use the thumbnailer library, but it can be dynamically replaced in the constructor
# https://github.com/merlin-p/thumbnailer.git

class ThumbnailCreator
  def initialize(thumbnailer = nil)
    @thumbnailer = thumbnailer || ThumbnailerWrapper.new
  end

  def self.supported_formats
    Thumbnailer.supported_formats.map {|x| x.to_s }
  end

  def create_derivative(tmp_path, _original_file, _db_id, result, record)
    begin
      thumbnail = @thumbnailer.create_thumbnail(tmp_path)
=======
# Currently we use the thumbnailer library
# https://github.com/merlin-p/thumbnailer.git

class ThumbnailCreator
  def create_derivative(tmp_path, _, _, result, record)
    begin
      thumbnail = Thumbnailer.create(tmp_path)

>>>>>>> applying-gem-shrine-2
      if thumbnail.present?
        dir = File.dirname(thumbnail)
        thumb_path = "#{dir}/#{record.identifier}.thumb.jpg"
        FileUtils.mkdir_p(dir) unless Dir.exist?(dir)
        FileUtils.move(thumbnail, thumb_path)
        result[:thumbnail] = File.open(thumb_path, 'rb')
<<<<<<< HEAD
        record[:thumb] = true
      end
    end
    result

  end

  class ThumbnailerWrapper
    def create_thumbnail(tmp_path)
      Thumbnailer.create(tmp_path)
    end
=======
        record.thumb = true
      end
    rescue StandardError => e
      Rails.logger.info('**** ThumbnailCreator failed ***')
      Rails.logger.error e
    end

    result
>>>>>>> applying-gem-shrine-2
  end
end
