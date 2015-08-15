class Paragraph < TextBlock
  # Default settings for a paragraph

  def initialize
    super
    @font_size = 12
    @font = :arial
    @font_style = :plain
  end
end
