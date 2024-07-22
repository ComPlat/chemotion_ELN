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
  def initialize(elements, width, type, code_type, display_sample, name = nil, short_label = nil, external_label = nil, molecule_name = nil, image = nil)
    # ratio use to scale the text on the PDF based on the width of the page
    ratio = width.to_f / 20
    super(
      page_size: page_size(width, code_type, display_sample, name, short_label, external_label, molecule_name, ratio),
      margin: [0, 0, 0, 0],
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
      move_down 5 * ratio
      # Depending on the code_type, generate the corresponding
      # label and the corresponding code
      case code_type
      when 'qr_code'
        # Generate the QR code itself
        qr_code(element, width, ratio)
      when 'bar_code'
        # Generate the barcode itself
        bar_code(element, ratio)
        bar_code_label_number(element, width, ratio)
      when 'data_matrix'
        # Generate the data matrix itself
        data_matrix(element, width, ratio)
      end
      if name && name != ''
        text_box name, text(ratio)[:text]
        move_down $text_offset.mm * ratio
      elsif name == ''
        text_box element.name, text(ratio)[:text]
        move_down $text_offset.mm * ratio
      end
      if short_label && short_label != ''
        text_box short_label, text(ratio)[:text]
        move_down $text_offset.mm * ratio
      elsif short_label == ''
        text_box element.short_label, text(ratio)[:text]
        move_down $text_offset.mm * ratio
      end
      if external_label && external_label != ''
        text_box external_label, text(ratio)[:text]
        move_down $text_offset.mm * ratio
      elsif external_label == ''
        text_box element.external_label, text(ratio)[:text]
        move_down $text_offset.mm * ratio
      end
      if molecule_name && molecule_name != ''
        text_box molecule_name, text(ratio)[:text]
        move_down $text_offset.mm * ratio * 2
      elsif molecule_name == ''
        text_box element.showed_name, text(ratio)[:text]
        move_down $text_offset.mm * ratio * 2
      end
      # Draw the sample if necessary
      if display_sample && image
        svg open(image), sample_option(width, ratio)
        move_down $sample_sgv_offset.mm
      end

      # Draw the bounds of the current page
      stroke_bounds
    end
  end

  private

  $sample_sgv_offset = 15
  $sample_name_offset = 10
  $qr_code_offset = 5
  $bar_code_offset = 1.5
  $data_matrix_code_offset = 5
  $text_offset = 2

  # Generate the size of the page
  def page_size(width, code_type, display_sample, name = nil, short_label = nil, external_label = nil, molecule_name = nil, ratio)
    height = 0
    if code_type
      if code_type == 'qr_code' || code_type == 'data_matrix'
        height += 10
      elsif code_type == 'bar_code'
        height += 12
      end
    end
    if display_sample
      height += $sample_sgv_offset
    end
    if name
      height += $text_offset
    end
    if short_label
      height += $text_offset
    end
    if external_label
      height += $text_offset
    end
    if molecule_name
      height += $text_offset * 2
    end

    [width.to_f.mm, (height * ratio).mm]
  end

  def sample_option(width, ratio)
    {width: 20.mm * ratio, height: 20.mm * ratio, at: [(width.to_f / 2), cursor]}
  end

  def text(ratio)
    { text: { at: [5 * ratio, cursor], size: 3 * ratio, overflow: :shrink_to_fit } }
  end

  def qr_code_label_options(ratio)
    { at: [5 * ratio, cursor], size: 4 * ratio, overflow: :shrink_to_fit, height: 20 * ratio}
  end

  def qr_code_label(text, ratio)
    text_box text, qr_code_label_options(ratio)
    move_down $sample_name_offset * ratio
  end

  def qr_code_options(width, ratio)
    { height: 6.mm * ratio, width: 6.mm * ratio, margin: 0, at: [(width.to_f / 2).mm - 6.mm * (ratio / 2), cursor] }
  end

  def qr_code(element, width, ratio)
    qr_code = Barby::QrCode.new(element.code_log.value, size: 1, level: :l)
    outputter = outputter(qr_code)
    svg outputter.to_svg(qr_code_options(width, ratio)), qr_code_options(width, ratio)
    move_down $qr_code_offset * ratio
  end

  def bar_code_label_options(width, ratio)
    {
      text: { at: [4 * ratio, cursor], size: 4 * ratio, width: 20.mm * ratio, height: 5.4.mm * ratio },
      code: { at: [(width.to_f / 2).mm - (4 * ratio).mm, cursor - $bar_code_offset * ratio], size: 4 * ratio },
    }
  end

  def bar_code_label(text, width, ratio)
    text_box text, bar_code_label_options(width, ratio)[:text]
    move_down $sample_name_offset * ratio
  end

  def bar_code_label_number(element, width, ratio)
    text_box element.code_log.value_sm, bar_code_label_options(width, ratio)[:code]
    move_down $sample_name_offset * ratio
  end

  def bar_code_options(ratio)
    { height: 4.mm * ratio, width: 17.mm * ratio, margin: 0, xdim: 0.12.mm * ratio, at: [4 * ratio, cursor] }
  end

  def bar_code(element, ratio)
    outputter = outputter(Barby::Code128C.new(element.code_log.value_sm))
    svg outputter.to_svg(bar_code_options(ratio)), bar_code_options(ratio)
    move_down $bar_code_offset * ratio
  end

  def data_matrix_label_options(ratio)
    { text: { at: [4 * ratio, cursor], size: 4 * ratio, overflow: :shrink_to_fit } }
  end

  def data_matrix_label(text, ratio)
    text_box text, data_matrix_label_options(ratio)[:text]
    move_down $sample_name_offset * ratio
  end

  def data_matrix_options(width, ratio)
    { height: 6.mm * ratio, width: 6.mm * ratio, margin: 0, at: [(width.to_f / 2).mm - 6.mm * (ratio / 2), cursor] }
  end

  def data_matrix(element, width, ratio)
    outputter = outputter(Barby::DataMatrix.new(element.code_log.value))
    svg outputter.to_svg(data_matrix_options(width, ratio)), data_matrix_options(width, ratio)
    move_down $data_matrix_code_offset * ratio
  end

  def outputter(code)
    Barby::SvgOutputter.new(code)
  end
end
