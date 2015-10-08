class Report::Paragraph < Report::TextBlock
  # Default settings for a paragraph

  def initialize
    super
    @font_size = 12
    @font = :arial
    @font_style = :plain
  end

   def build params
    params[:text].each do |text|
      if text[:style].nil?
        add_text(text[:text])
      else
        add_text(text[:text], text[:style].to_hash)
      end
    end
  end
end
