require 'barby'
require 'barby/barcode/code_128'
require 'barby/barcode/qr_code'
require 'barby/barcode/data_matrix'
require 'rubygems'
require 'semacode'
require 'barby/outputter/svg_outputter'
require "prawn/measurement_extensions"
require 'open-uri'
require 'net/http'

class CodePdf < Prawn::Document
  def initialize(elements, size, type, pdfType, displaySample, image = nil)
    super(
      page_size: page_size(size, pdfType),
      margin: [0, 0, 0, 0]
    )

    # Iterate over each element in the array
    # and create a new page for each element,
    # except for the first one
    elements.each_with_index do |element, i|
      start_new_page unless i.zero?

      # Generate the text to be displayed on the PDF based on
      # the type of the element and its label
      text = if type == 'sample' || type == 'reaction'
               "#{type.capitalize}: #{element.short_label}\n#{element.name}"
             else
               "#{type.capitalize} ID: #{element.id}\n#{element.name}"
             end

      # Depending on the pdfType, generate the corresponding
      # label and the corresponding code
      case pdfType
      when 'qr_code'
        # Generate the label for the QR code
        qr_code_label(element, size, type, text)
        # Generate the QR code itself
        qr_code(element, size)
      when 'bar_code'
        # Generate the label for the barcode
        bar_code_label(element, size, type, text)
        # Generate the barcode itself
        bar_code(element, size)
      when 'data_matrix'
        # Generate the label for the data matrix
        data_matrix_label(element, size, type, text)
        # Generate the data matrix itself
        data_matrix(element, size)
      end
      if displaySample
        if image
          image_url = URI.parse(image)
          response = Net::HTTP.get_response(image_url)
          if response.is_a?(Net::HTTPSuccess)
            image_data = response.body
          image image_data, width: 150, height: 150
          else
            puts "Failed to fetch the image data"
          end
        end
      end 
      # Draw the bounds of the current page
      stroke_bounds
    end
  end

  private

  def page_size(size, pdfType)
    case size
    when "small"
      if pdfType == 'bar_code'
        [25.4.mm, 22.mm]
      else
        [25.4.mm, 10.mm]
      end
    when "big"
      if pdfType == 'bar_code'
        [36.mm, 25.mm]
      else
        [36.mm, 15.mm]
      end
    else
      [25.4.mm, 37.mm]
    end
  end

  # qr code and options
  def qr_code_label_options(size)
    case size
    when 'small'
      {at: [6.mm + 8, self.bounds.top - 5], size: 5}
    when 'big'
      {at: [10.mm + 8, self.bounds.top - 5], size: 6}
    else
      {at: [6.mm + 8, self.bounds.top - 5], size: 5}
    end
  end

  def qr_code_label(element, size, type, text)
    text_box text, qr_code_label_options(size)
  end

  def qr_code_options(size)
    case size
    when "small"
      {height: 6.mm, width: 6.mm, margin: 0, at: [5, self.bounds.top - 5]}
    when "big"
      {height: 10.mm, width: 10.mm, margin: 0, at: [5, self.bounds.top - 5]}
    else
      {height: 6.mm, width: 6.mm, margin: 0, at: [5, self.bounds.top - 5]}
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
    when 'small'
      {
        text: {at: [1.mm + 2, self.bounds.top - 5], size: 5, width: 20.mm, height: 5.4.mm},
        code: {at: [7.mm, self.bounds.top - 18.mm - 1 ], size: 5}
      }
    when 'big'
      {
        text: {at: [1.mm + 2, self.bounds.top - 5], size: 6, width: 20.mm, height: 5.4.mm},
        code: {at: [13.mm, self.bounds.top - 20.mm], size: 6}
      }
    else
      {
        text: {at: [1.mm + 2, self.bounds.top - 5], size: 5, width: 20.mm, height: 5.4.mm},
        code: {at: [7.mm, self.bounds.top - 18.mm - 1 ], size: 5}
      }
    end
  end

  def bar_code_label(element, size, type, text)
    text_box text, bar_code_label_options(size)[:text]
    text_box element.code_log.value_sm, bar_code_label_options(size)[:code]
  end

  def bar_code_options(size)
    case size
    when 'small'
      {height: 5.mm, width: 22.mm, margin: 0, xdim: 0.12.mm, at: [4, self.bounds.top - 18]}
    when 'big'
      {height: 3.3.mm, width: 33.mm, margin: 0, xdim: 0.12.mm, at: [4, self.bounds.top - 20]}
    else
      {height: 5.mm, width: 22.mm, margin: 0, xdim: 0.12.mm, at: [4, self.bounds.top - 18]}
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
        text: { at: [6.mm + 8, self.bounds.top - 5], size: 5, width: 20.mm, height: 5.4.mm }
      }
    when 'big'
      {
        text: { at: [10.mm + 8, self.bounds.top - 5], size: 6, width: 20.mm, height: 5.4.mm }
      }
    else
      {
        text: { at: [6.mm + 8, self.bounds.top - 5], size: 5, width: 20.mm, height: 5.4.mm }
      }
    end
  end

  def data_matrix_label(element, size, type, text)
    text_box text, data_matrix_label_options(size)[:text]
  end

  def data_matrix_options(size)
    case size
    when "small"
      {height: 6.mm, width: 6.mm, margin: 0, at: [5, self.bounds.top - 5]}
    when "big"
      {height: 10.mm, width: 10.mm, margin: 0, at: [5, self.bounds.top - 5]}
    else
      {height: 6.mm, width: 6.mm, margin: 0, at: [5, self.bounds.top - 5]}
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
