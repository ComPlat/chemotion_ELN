require 'rtf'

class Report::RTFReport < Report::Report
  def initialize
    super
    @document = RTF::Document.new(RTF::Font.new(RTF::Font::ROMAN, 'Times New Roman'))
  end

  def generate_report
    # Render header
    unless @header.nil?
      right_justification = RTF::CharacterStyle.new
      header = RTF::HeaderNode.new(@document)
      table = header.table(3, 2, 4100, 4100)
      table.border_width = 0
      table[0][0] << 'Chemistry Experiment: ' + @header.experiment
      table[1][0] << 'Owner: ' + @header.owner
      table[0][1].apply(right_justification) << 'Created: ' + @header.created_date.to_s
      table[1][1].apply(right_justification) << 'Printed: ' + @header.printed_date.to_s
      table[2][1].apply(right_justification) << 'Status: ' + @header.status

      header.line_break

      @document.header = header
    end

    # Render text blocks in the document
    @report_data.each do |report_element|
      case report_element.class.name
      when 'Report::Paragraph', 'Report::Subtitle', 'Report::Title', 'Report::TextBlock'
        paragraph_style = RTF::ParagraphStyle.new
        paragraph_style.justification = justification report_element.justification
        @document.paragraph(paragraph_style) do |p|
          report_element.text.each do |report_text|
            if report_text.is_line_break?
              p.line_break
            else
              character_style = RTF::CharacterStyle.new
              character_style.font = font(report_element.font)
              character_style.font_size = report_element.font_size*2 #Probably bug in the library
              character_style.bold = report_text.font_style == :bold ? true : false

              p.apply(character_style) do |l|
                l << report_text.text
              end
            end
          end
        end
      when 'Report::Table'
        style             = RTF::CharacterStyle.new
        style.font = font(report_element.font)
        report_element.set_table_dimensions

        dim = report_element.table_dimensions
        table = @document.table(report_element.table_size[:x], report_element.table_size[:y], *dim)
        table.border_width = 5

        report_element.table_data.each_with_index do |line, li|
          line.each_with_index do |text, ci|
            table[li][ci] << text
          end
        end
      when 'Report::Image'
        @document.paragraph do |p|
          image = p.image(report_element.obtain_png_file)
          image.x_scaling = report_element.size[:x]
          image.y_scaling = report_element.size[:y]
        end
      else
        raise "Fehler: unbeachtetes Objekt im Report Data Objekt (Class: #{report_element.class.name})"
      end
    end

    @document.to_rtf
  end

  private

  def justification position
    case position
    when :center
      RTF::ParagraphStyle::CENTER_JUSTIFY
    when :left
      RTF::ParagraphStyle::LEFT_JUSTIFY
    when :right
      RTF::ParagraphStyle::RIGHT_JUSTIFY
    when :justify
      RTF::ParagraphStyle::FULL_JUSTIFY
    end
  end

  def font font_style
    case font_style
    when :courier
      RTF::Font.new(RTF::Font::MODERN, 'Courier')
    when :times_new_roman
      RTF::Font.new(RTF::Font::ROMAN, 'Times New Roman')
    when :arial
      RTF::Font.new(RTF::Font::ROMAN, 'Arial')
    end
  end
end
