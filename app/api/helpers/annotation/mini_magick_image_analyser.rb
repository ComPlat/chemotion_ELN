# frozen_string_literal: true

# Helper to get the width and height of an image. The magic is done by MiniMagick library
class MiniMagickImageAnalyser
    require 'mini_magick'
    def getImageDimension(pathToImage)
        image=MiniMagick::Image.open(pathToImage);
        return [image[:width],image[:height]];
    end
end