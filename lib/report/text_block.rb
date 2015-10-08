class Report::TextBlock
  attr_accessor :font, :font_style, :font_size, :justification

  def initialize
    # Container of all the text pieces
    @text = Array.new

    # Standard styles
    @font_style = :plain
    @font = :times_new_roman
    @justification = :left
    @font_size = 12
  end

  def text
    @text
  end

  def justify justification
    @justification = justification
  end

  # Logic

  def add_text string, style = []
    report_text = Report::ReportText.new
    report_text.text = string

    report_text.font_style = @font_style
    report_text.font = @font
    report_text.font_size = @font_size

    report_text.apply_style(style)

    @text.push(report_text)
  end

  def line_break
    lb = Report::ReportText.new(:line_break)
    @text.push(lb)
  end
end
