require 'barby'
require 'barby/barcode/code_128'
require 'barby/barcode/qr_code'
require 'barby/barcode/data_matrix'
require 'rubygems'
require 'semacode'
require 'barby/outputter/svg_outputter'
require "prawn/measurement_extensions"

class CodePdf < Prawn::Document
  def initialize(elements, size, type)
    super(
      page_size: page_size(size),
      margin: [0, 0, 0, 0]
    )

    elements.each_with_index do |element, i|
      start_new_page unless i == 0

      qr_code_label(element, size, type)
      qr_code(element, size)
      bar_code_label(element, size, type)
      bar_code(element, size)
      data_matrix_label(element, size, type)
      data_matrix(element, size)
      stroke_bounds
    end
  end

  private

    def page_size(size)
      case size
      when "small"
        [25.4.mm, 37.mm]
      when "big"
        [36.mm, 50.mm]
      else
        [25.4.mm, 37.mm]
      end
    end

    # qr code and options
    def qr_code_label_options(size)
      case size
      when "small"
        {at: [6.mm + 8, self.bounds.top - 3], size: 5}
      when "big"
        {at: [10.mm + 8, self.bounds.top - 3], size: 5}
      else
        {at: [6.mm + 8, self.bounds.top - 3], size: 5}
      end
    end

    def qr_code_label(element, size, type)
      text = "#{type.capitalize} ID: #{element.id}\n#{element.name}"
      text_box text, qr_code_label_options(size)
    end

    def qr_code_options(size)
      case size
      when "small"
        {height: 6.mm, width: 6.mm, margin: 0, at: [5, self.bounds.top - 3]}
      when "big"
        {height: 10.mm, width: 10.mm, margin: 0, at: [5, self.bounds.top - 3]}
      else
        {height: 6.mm, width: 6.mm, margin: 0, at: [5, self.bounds.top - 3]}
      end
    end

    def qr_code(element, size)
      qr_code = Barby::QrCode.new(element.code_log.value, size: 1, level: :l)
      outputter = outputter(qr_code)
      svg outputter.to_svg(qr_code_options(size)), qr_code_options(size)
    end

    # barcode and options
    def bar_code_label_options(size)
      case size
      when "small"
        {
          text: {at: [6.mm + 8, 19.mm], size: 5, width: 20.mm, height: 5.4.mm},
          code: {at: [9.mm, self.bounds.bottom + 2.mm], size: 5}
        }
      when "big"
        {
          text: {at: [10.mm + 8, 19.mm], size: 5, width: 20.mm, height: 5.4.mm},
          code: {at: [15.mm, self.bounds.bottom + 2.mm], size: 5}
        }
      else
        {
          text: {at: [6.mm + 8, 19.mm], size: 5, width: 20.mm, height: 5.4.mm},
          code: {at: [9.mm, self.bounds.bottom + 2.mm], size: 5}
        }
      end
    end

    def bar_code_label(element, size, type)
      text = "#{type.capitalize} ID: #{element.id}\n#{element.name}"
      text_box text, bar_code_label_options(size)[:text]
      text_box element.code_log.value_sm, bar_code_label_options(size)[:code]
    end

    def bar_code_options(size)
      case size
      when "small"
        {height: 5.mm, width: 22.mm, margin: 0, xdim: 0.12.mm, at: [1.5.mm, 14.5.mm]}
      when "big"
        {height: 3.3.mm, width: 33.mm, margin: 0, xdim: 0.12.mm, at: [1.5.mm, 14.5.mm]}
      else
        {height: 5.mm, width: 22.mm, margin: 0, xdim: 0.12.mm, at: [1.5.mm, 14.5.mm]}
      end
    end

    def bar_code(element, size)
      outputter = outputter(Barby::Code128C.new(element.code_log.value_sm))
      svg outputter.to_svg(bar_code_options(size)), bar_code_options(size)
    end

    # data matrix and options
    def data_matrix_label_options(size)
      case size
      when 'small'
        {
          text: { at: [6.mm + 8, 26.mm], size: 5, width: 20.mm, height: 5.4.mm }
        }
      when 'big'
        {
          text: { at: [10.mm + 8, 32.mm], size: 5, width: 20.mm, height: 5.4.mm }
        }
      else
        {
          text: { at: [6.mm + 8, 26.mm], size: 5, width: 20.mm, height: 5.4.mm }
        }
      end
    end

    def data_matrix_label(element, size, type)
      text = "#{type.capitalize} ID: #{element.id}\n#{element.name}"
      text_box text, data_matrix_label_options(size)[:text]
    end

    def data_matrix_options(size)
      case size
      when "small"
        { height: 6.mm, width: 6.mm, margin: 0, xdim: 0.12.mm, at: [1.5.mm, 26.mm] }
      when "big"
        { height: 10.mm, width: 10.mm, margin: 0, xdim: 0.12.mm, at: [1.5.mm, 32.mm] }
      else
        { height: 6.mm, width: 6.mm, margin: 0, xdim: 0.12.mm, at: [1.5.mm, 26.mm] }
      end
    end

    def data_matrix(element, size)
      outputter = outputter(Barby::DataMatrix.new(element.code_log.value))
      svg outputter.to_svg(data_matrix_options(size)), data_matrix_options(size)
    end

    def outputter(code)
      Barby::SvgOutputter.new(code)
    end
end
