# frozen_string_literal: true

# Helper to get the width and height of an image. The magic is done by MiniMagick library
class MiniMagickImageAnalyser
  require 'mini_magick'
  def get_image_dimension(path_to_image)
    image = MiniMagick::Image.open(path_to_image)
    [image[:height], image[:width]]
  rescue StandardError
    [0, 0]
  end
end
