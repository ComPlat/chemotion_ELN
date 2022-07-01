# frozen_string_literal: true

# Class for creating thumbnails. It must fulfill the contract of the "virtual" interface for creating derivatives:
# createDerivative(tmpPath,originalFile,dbId,result,record)
# Currently we use the thumbnailer library, but it can be dynamically replaced in the constructor
# https://github.com/merlin-p/thumbnailer.git

class ThumbnailCreator

   def initialize(thumbnailer=nil)
        if thumbnailer
            @thumbnailer=thumbnailer;
        else
            @thumbnailer=ThumbnailerWrapper.new;
        end
    end

   def createDerivative(tmpPath,originalFile,dbId,result,record)
      thumbnail = @thumbnailer.createThumbnail(tmpPath)
      if thumbnail.present?
         dir = File.dirname(thumbnail)
         thumb_path = "#{dir}/#{record.identifier}.thumb.jpg"
         FileUtils.mkdir_p(dir) unless Dir.exist?(dir)
         FileUtils.move(thumbnail, thumb_path)
         result[:thumbnail] = File.open(thumb_path, 'rb')
         record[:thumb] = true
      end

      return result;
   end

   class ThumbnailerWrapper
      def createThumbnail(tmpPath)
         return Thumbnailer.create(tmpPath);
      end
   end
end