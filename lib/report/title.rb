class Report::Title < Report::TextBlock
  # Default settings for a title

  def initialize
    super
    @font_size = 20
    @font = :arial
    @font_style = :bold
    @justification = :center
  end
end
