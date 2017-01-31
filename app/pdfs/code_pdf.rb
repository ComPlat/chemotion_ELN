require 'barby'
require 'barby/barcode/code_128'
require 'barby/barcode/qr_code'
require 'barby/outputter/svg_outputter'

# TODO center correctly once formats are defined
#draw_text element.bar_code, at: [self.bounds.width/2 - 20, self.bounds.bottom]

class CodePDF < Prawn::Document
  def initialize(elements, size, type)
    super(
      page_size: page_size(size, type),
      margin: [0, 0, 0, 0]
    )

    elements.each_with_index do |element, i|
      start_new_page unless i == 0
        bar_code_label(element, type, size)
        qr_code(element, type, size)
        bar_code(element, type, size)
    end
  end

  def page_size(size, type)
    case size
    when "small"
      [72, 50]
    when "big"
      [72, 72]
    else
      [200, 180]
    end
  end

  def bar_code_label(element, type, size)
    text = (type == "analysis" || type == "nmr_analysis") ? element.sample_id : element.id
    draw_text text, at: [60, 20], size: 5, rotate: 270
  end

  def qr_code(element, type, size)
    return if type == "nmr_analysis"

    qr_code = Barby::QrCode.new(element.qr_code, size: 1, level: :l)
    outputter = Barby::SvgOutputter.new(qr_code)
    height = 15.6
    width = 15.6
    svg outputter.to_svg(margin: 0, height: height, width: width), at: [50, self.bounds.top], width: width, height: height
  end

  def bar_code(element, type, size)
    case type
    when "nmr_analysis"
      bar_code_nmr(element, size)
    else
      bar_code_non_nmr(element, size)
    end
  end

  def bar_code_outputter(code)
    Barby::SvgOutputter.new(code)
  end

  def bar_code_nmr(element, size)
    p element
    outputter = bar_code_outputter(Barby::Code128C.new(element.bar_code_bruker))
    height = 500
    width = 55
    # xdim 0.72 = 10mil
    svg outputter.to_svg(margin: 11.34, height: height, xdim: 0.72, width: width), at: [0, self.bounds.bottom + 60], height: height, width: width
  end

  def bar_code_non_nmr(element, size)
    outputter = bar_code_outputter(Barby::Code128B.new(element.bar_code))
    height = 300
    width = 70
    # xdim 0.72 = 10mil
    svg outputter.to_svg(margin: 0, height: height, xdim: 0.72), at: [0, self.bounds.bottom + 20], height: height, width: width
  end
end
