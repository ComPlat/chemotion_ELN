require 'rtf'

class RTFReport < Report
  def initialize
    super
    @document = RTF::Document.new(RTF::Font.new(RTF::Font::ROMAN, 'Times New Roman'))
  end

  def generate_report
    @text_data.each do |text_block|
      paragraph_style = RTF::ParagraphStyle.new
      paragraph_style.justification = justification text_block.justification
      @document.paragraph(paragraph_style) do |p|
        text_block.text.each do |report_text|
          if report_text.is_line_break?
            p.line_break
          else
            character_style = RTF::CharacterStyle.new
            character_style.font = RTF::Font.new(RTF::Font::MODERN, 'Courier')
            character_style.font_size = text_block.font_size*2 #Probably bug in the library
            character_style.bold = report_text.font_style == :bold ? true : false

            p.apply(character_style) do |l|
              l << report_text.text
            end
          end
        end
      end
    end

    puts @image.obtain_png_file

    # Set image
    @document.paragraph do |p|
      image = p.image(@image.obtain_png_file)
      image.x_scaling = @image.size[:x]
      image.y_scaling = @image.size[:y]
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
