require 'barby'
require 'barby/barcode/code_128'
require 'barby/barcode/qr_code'
require 'barby/outputter/svg_outputter'

class CodePDF < Prawn::Document
  def initialize(elements, size, type)
    super(
      page_size: page_size(size, type),
      margin: [10, 10, 10, 10]
    )

    elements.each_with_index do |element, i|
      start_new_page unless i == 0
      label(element, type)
      qr_code(element, type)
      bar_code(element, type)

      # TODO center correctly once formats are defined
      draw_text element.bar_code, at: [self.bounds.width/2 - 20, self.bounds.bottom]
    end
  end

# TODO definition of "small", "big", NMR format
  def page_size(size, type)
    [200, 180]
  end

  def label(element, type)
    case type
    when "analysis"
      text "tbd"
    when "nmr_analysis"
      text "tbd"
    else
      text "#{element.class.name} #{element.id}"
      # TODO short_label if element is a sample?
      text element.name
    end
  end

  def qr_code(element, type)
    return if type == "nmr_analysis"

    qr_code = Barby::QrCode.new(element.qr_code, size: 1, level: :l)
    outputter = Barby::SvgOutputter.new(qr_code)
    height = 70
    width = 70
    svg outputter.to_svg(margin: 0, height: height, width: width), at: [100, self.bounds.top], width: width, height: height
  end

  def bar_code(element, type)
    bar_code = case type
               when "nmr_analysis"
                 Barby::Code128B.new(element.bar_code_bruker)
               else
                 Barby::Code128B.new(element.bar_code)
               end

    outputter = Barby::SvgOutputter.new(bar_code)
    height = 40
    svg outputter.to_svg(margin: 0, height: height), at: [0, self.bounds.bottom + height + 25], height: height, width: self.bounds.width
  end
end
