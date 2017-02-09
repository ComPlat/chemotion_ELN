require 'barby'
require 'barby/barcode/code_128'
require 'barby/barcode/qr_code'
require 'barby/outputter/svg_outputter'
require "prawn/measurement_extensions"

class AnalysisNmrPdf < Prawn::Document
  attr_reader :element

  def initialize(elements)
    super(
      page_size: [25.4.mm, 28.mm],
      margin: [0, 0, 0, 0]
    )

    elements.each_with_index do |element, i|
      start_new_page unless i == 0

      bar_code_label(element)
      qr_code_label(element)
      qr_code(element)
      bar_code(element)
      stroke_bounds
    end
  end


  def bar_code_label(element)
    text = "Sample ID: #{element.sample_id}\n#{element.name}"
    text_box text, at: [68, 19.mm], size: 5, rotate: 270, width: 20.mm, height: 5.4.mm
  end

  def qr_code_label(element)
    text = "Sample ID: #{element.sample_id}\n#{element.name}"
    text_box text, at: [5.5.mm + 10, self.bounds.top - 3], size: 5
  end

  def qr_code(element)
    qr_code = Barby::QrCode.new(element.qr_code, size: 1, level: :l)
    outputter = outputter(qr_code)
    height = 5.5.mm
    width = 5.5.mm
    svg outputter.to_svg(margin: 0, height: height, width: width), at: [5, self.bounds.top - 3], width: width, height: height
  end

  def bar_code(element)
    outputter = outputter(Barby::Code128C.new(element.bar_code_bruker))
    height = 25.mm
    width = 14.mm
    # xdim 0.254mm = 10mil
    svg outputter.to_svg(margin: 0, height: height, xdim: 0.254.mm, width: width), at: [3.mm, 19.mm], height: height, width: width
  end

  def outputter(code)
    Barby::SvgOutputter.new(code)
  end
end
