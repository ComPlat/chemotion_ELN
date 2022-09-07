# frozen_string_literal: true

# Class for creating thumbnails. It must fulfill the contract of the "virtual" interface for creating derivatives:
# createDerivative(tmpPath,originalFile,dbId,result,record)
# Currently we use the thumbnailer library, but it can be dynamically replaced in the constructor
# https://github.com/merlin-p/thumbnailer.git

class ThumbnailCreator
    def initialize(thumbnailer = nil)
      @thumbnailer = thumbnailer || ThumbnailerWrapper.new
    end
  
    def create_derivative(tmp_path, original_file, db_id, result, record)
      thumbnail = @thumbnailer.create_thumbnail(tmp_path)
      if thumbnail.present?
        dir = File.dirname(thumbnail)
        thumb_path = "#{dir}/#{record.identifier}.thumb.jpg"
        FileUtils.mkdir_p(dir) unless Dir.exist?(dir)
        FileUtils.move(thumbnail, thumb_path)
        result[:thumbnail] = File.open(thumb_path, 'rb')
        record[:thumb] = true
      end
  
      result
    end
  
    class ThumbnailerWrapper
      def create_thumbnail(tmp_path)
        Thumbnailer.create(tmp_path)
      end
    end
  end