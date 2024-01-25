# frozen_string_literal: true

# Helper to get the width and height of an image. The magic is done by MiniMagick library
class MiniMagickImageAnalyser
  def get_image_dimensions(path_to_image)
    image = MiniMagick::Image.open(path_to_image)

    {
      width: image[:width],
      height: image[:height],
    }
  rescue StandardError
    { width: 0, height: 0 }
  end
end
