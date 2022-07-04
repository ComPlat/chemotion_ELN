# frozen_string_literal: true

# Helper to get the width and height of an image. The magic is done by MiniMagick library
class MiniMagickImageAnalyser
  require 'mini_magick'
  def get_image_dimension(path_to_image)
    image = MiniMagick::Image.open(path_to_image)
    [image[:width], image[:height]]
  end
end
