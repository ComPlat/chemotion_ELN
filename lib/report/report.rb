require 'tempfile'

module Report
	class Report
		def initialize
			@report_data = Array.new
			@image = nil
			@header = nil

			yield self
		end

		def header
			header = Header.new
			yield header
			@header = header
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

		def add_table(dimension_x, dimension_y)
			table = Table.new(dimension_x, dimension_y)
			yield table
			add_to_report(table)
		end

	  def add_image
	    if block_given?
	      image = Image.new
	      yield image
	      add_to_report(image)
	    end
	  end

	  def generate_report
	    raise 'Error: Function not implemented'
	  end

	  private
	    def add_to_report (data)
	      @report_data.push(data)
	    end
	end
end
