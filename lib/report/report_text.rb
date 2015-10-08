class Report::ReportText
  attr_accessor :font, :font_style, :font_size, :text

  def initialize category = nil
    @line_break = (category == :line_break) ? true : false
  end

  def is_line_break?
    @line_break
  end

  def apply_style style
    style.each do |key, value|
      instance_variable_set("@" + key.to_s, value.to_sym)
    end
  end
end
