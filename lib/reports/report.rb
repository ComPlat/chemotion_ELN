require 'tempfile'

class Report
	def initialize
		@text_data = Array.new
		@image = nil

		yield self
	end

	def add_title
    title = Title.new
    yield title
    add_to_report(title)
  end

  def add_subtitle
    subtitle = Subtitle.new
    yield subtitle
    add_to_report(subtitle)
  end

  def add_paragraph
    paragraph = Paragraph.new
    yield paragraph
    add_to_report(paragraph)
  end

  def line_break
    nl = TextBlock.new
    add_to_report(nl)
  end

  def image
    if block_given?
      image = Image.new
      yield image
      @image = image
    end
  end

  def generate_report
    raise 'Error: Function not implemented'
  end

  private
    def add_to_report (text)
      @text_data.push(text)
    end
end
