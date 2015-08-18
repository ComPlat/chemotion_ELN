require 'rtf'

class RTFReport < Report
  def initialize
    super
    @document = RTF::Document.new(RTF::Font.new(RTF::Font::ROMAN, 'Times New Roman'))
  end

  def generate_report
    @report_data.each do |report_element|
      case report_element.class.name
      when 'Paragraph', 'Subtitle', 'Title', 'TextBlock'
        paragraph_style = RTF::ParagraphStyle.new
        paragraph_style.justification = justification report_element.justification
        @document.paragraph(paragraph_style) do |p|
          report_element.text.each do |report_text|
            if report_text.is_line_break?
              p.line_break
            else
              character_style = RTF::CharacterStyle.new
              character_style.font = RTF::Font.new(RTF::Font::MODERN, 'Courier')
              character_style.font_size = report_element.font_size*2 #Probably bug in the library
              character_style.bold = report_text.font_style == :bold ? true : false

              p.apply(character_style) do |l|
                l << report_text.text
              end
            end
          end
        end
      when 'Table'
        style             = RTF::CharacterStyle.new
        style.bold        = true
        style.underline   = true

        table = @document.table(3, 3, 2000, 4000, 2000)
        table.border_width = 5

        report_element.table_data.each_with_index do |line, li|
          line.each_with_index do |text, ci|
            puts li
            table[li][ci] << text
          end
        end
      when 'Image'
        @document.paragraph do |p|
          image = p.image(report_element.obtain_png_file)
          image.x_scaling = report_element.size[:x]
          image.y_scaling = report_element.size[:y]
        end
      else
        raise 'Fehler: unbeachtetes Objekt im Report Data Objekt'
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
end
