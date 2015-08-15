class Subtitle < TextBlock
  # Default settings for a subtitle

  def initialize
    super
    @font_size = 16
    @font = :arial
    @font_style = :bold
  end
end
