require 'barby'
require 'barby/barcode/code_128'
require 'barby/barcode/qr_code'
require 'barby/barcode/data_matrix'
require 'rubygems'
require 'semacode'
require 'barby/outputter/svg_outputter'
require 'prawn/measurement_extensions'
require 'open-uri'
require 'net/http'

class CodePdf < Prawn::Document
  def initialize(elements, size, type, pdf_type, display_sample, image = nil)
    super(
      page_size: page_size(size, pdf_type, display_sample),
      margin: [0, 0, 0, 0]
    )

    elements.each_with_index do |element, i|
      start_new_page unless i.zero?

      # Generate the text to be displayed on the PDF based on
      # the type of the element and its label
      text = if type == 'sample' || type == 'reaction'
               "#{type.capitalize}: #{element.short_label}\n#{element.name}"
             else
               "#{type.capitalize} ID: #{element.id}\n#{element.name}"
             end

      # Depending on the pdf_type, generate the corresponding
      # label and the corresponding code
      case pdf_type
      when 'qr_code'
        # Generate the label for the QR code
        qr_code_label(size, text)
        # Generate the QR code itself
        qr_code(element, size)
      when 'bar_code'
        # Generate the label for the barcode
        bar_code_label(element, size, text)
        # Generate the barcode itself
        bar_code(element, size)
      when 'data_matrix'
        # Generate the label for the data matrix
        data_matrix_label(size, text)
        # Generate the data matrix itself
        data_matrix(element, size)
      end
      # Draw the sample if necessary
      svg open(image), sample_option(size) if display_sample && image
      # Draw the bounds of the current page
      stroke_bounds
    end
  end

  private

  # Generate the size of the page
  def page_size(size, pdf_type, display_sample)
    if display_sample
      if pdf_type == 'bar_code'
        case size
        when 'small' then [25.4.mm, 30.mm]
        when 'big' then [36.mm, 40.mm]
        end
      else
        case size
        when 'small' then [25.4.mm, 20.mm]
        when 'big' then [36.mm, 28.mm]
        end
      end
    elsif pdf_type == 'bar_code'
      case size
      when 'small' then [25.4.mm, 21.mm]
      when 'big' then [36.mm, 25.mm]
      end
    else
      case size
      when 'small' then [25.4.mm, 10.mm]
      when 'big' then [36.mm, 14.mm]
      end
    end
  end

  def sample_option(size)
    if size == 'small'
      { at: [22, self.bounds.top - 4], width: 40, height: 40 }
    else
      { at: [30, self.bounds.top - 4], width: 60, height: 60 }
    end
  end

  def qr_code_label_options(size)
    case size
    when 'small'
      { at: [6.mm + 8, self.bounds.bottom + 23], size: 5, overflow: :shrink_to_fit }
    when 'big'
      { at: [10.mm + 8, self.bounds.bottom + 35], size: 7, overflow: :shrink_to_fit }
    end
  end

  def qr_code_label(size, text)
    text_box text, qr_code_label_options(size)
  end

  def qr_code_options(size)
    case size
    when 'small'
      { height: 6.mm, width: 6.mm, margin: 0, at: [5, self.bounds.bottom + 23] }
    when 'big'
      { height: 10.mm, width: 10.mm, margin: 0, at: [5, self.bounds.bottom + 35] }
    end
  end

  def qr_code(element, size)
    qr_code = Barby::QrCode.new(element.code_log.value, size: 1, level: :l)
    outputter = outputter(qr_code)
    svg outputter.to_svg(qr_code_options(size)), qr_code_options(size)
  end

  def bar_code_label_options(size)
    case size
    when 'small'
      {
        text: { at: [1.mm + 2, self.bounds.bottom + 52], size: 4, width: 20.mm, height: 5.4.mm },
        code: { at: [7.mm, self.bounds.bottom + 8 ], size: 4 },
      }
    when 'big'
      {
        text: { at: [1.mm + 2, self.bounds.bottom + 65], size: 6, width: 30.mm, height: 5.4.mm },
        code: { at: [13.mm, self.bounds.bottom + 10], size: 6 },
      }
    end
  end

  def bar_code_label(element, size, text)
    text_box text, bar_code_label_options(size)[:text]
    text_box element.code_log.value_sm, bar_code_label_options(size)[:code]
  end

  def bar_code_options(size)
    case size
    when 'small'
      { height: 5.mm, width: 22.mm, margin: 0, xdim: 0.12.mm, at: [4, self.bounds.bottom + 40] }
    when 'big'
      { height: 3.3.mm, width: 33.mm, margin: 0, xdim: 0.12.mm, at: [4, self.bounds.bottom + 45] }
    end
  end

  def bar_code(element, size)
    outputter = outputter(Barby::Code128C.new(element.code_log.value_sm))
    svg outputter.to_svg(bar_code_options(size)), bar_code_options(size)
  end

  def data_matrix_label_options(size)
    case size
    when 'small'
      { text: { at: [6.mm + 8, self.bounds.bottom + 23], size: 5, overflow: :shrink_to_fit } }
    when 'big'
      { text: { at: [10.mm + 8, self.bounds.bottom + 35], size: 7, overflow: :shrink_to_fit } }
    end
  end

  def data_matrix_label(size, text)
    text_box text, data_matrix_label_options(size)[:text]
  end

  def data_matrix_options(size)
    case size
    when 'small'
      { height: 6.mm, width: 6.mm, margin: 0, at: [5, self.bounds.bottom + 23] }
    when 'big'
      { height: 10.mm, width: 10.mm, margin: 0, at: [5, self.bounds.bottom + 35] }
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

