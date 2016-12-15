require 'barby'
require 'barby/barcode/code_128'
require 'barby/barcode/qr_code'
require 'barby/outputter/svg_outputter'

# TODO definition of "small" and "big" format
class CodePDF < Prawn::Document
  def initialize(element, size)
    @element = element
    @size = size

    super(
      page_size: [200, 180],
      margin: [10, 10, 10, 10]
    )

    text "#{element.class.name} #{element.id}"
    text element.short_label
    qr_code
    bar_code

    # TODO center correctly once formats are defined
    draw_text element.bar_code, at: [self.bounds.width/2 - 20, self.bounds.bottom]
  end

  def qr_code
    qr_code = Barby::QrCode.new(@element.qr_code, size: 1, level: :l)
    outputter = Barby::SvgOutputter.new(qr_code)
    height = 70
    width = 70
    svg outputter.to_svg(margin: 0, height: height, width: width), at: [100, self.bounds.top], width: width, height: height
  end

  def bar_code
    bar_code = Barby::Code128B.new(@element.bar_code)
    outputter = Barby::SvgOutputter.new(bar_code)

    height = 40
    svg outputter.to_svg(margin: 0, height: height), at: [0, self.bounds.bottom + height + 25], height: height, width: self.bounds.width
  end
end
