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
  $code_image_size_limit_right = 0.3
  $margin = 5
  $sample_sgv_offset = 20
  $sample_name_offset = 10
  $qr_code_offset = 5
  $bar_code_offset = 1.5
  $data_matrix_code_offset = 5
  $text_offset = 3

  def initialize(elements, width, type, code_type, code_image_size, display_sample, name = nil, short_label = nil, external_label = nil, molecule_name = nil, code_log = nil, text_position = nil, image = nil)
    # ratio use to scale the text on the PDF based on the width of the page
    image_ratio = get_svg_dimensions(image) if image

    # ratio use to scale the text on the PDF based on the width of the page
    ratio = width.to_f / 20

    # code image size limit
    if code_image_size.to_f > 100 || code_image_size.to_f < 0
      if code_type == 'bar_code'
        code_image_size = 100
      else
        code_image_size = 30
      end
    end

    code_image_size_ratio = code_image_size.to_f / 100

    # Set the code type to a valid value if it is not specified
    # Valid values are "bar_code", "qr_code", and "data_matrix"
    # If the code type is not valid, set it to "qr_code"
    if code_type != 'bar_code' && code_type != 'qr_code' && code_type != 'data_matrix'
      code_type = 'qr_code'
    end

    # Set the text position to a valid value if it is not specified
    # Valid values are "below" and "right"
    # If the text position is not valid, set it to "below"
    if text_position != 'below' && text_position != 'right'
      text_position = 'below'
    end

    # If the text position is "right" and the code image size ratio is greater than the limit,
    # set the text position to "below"
    if text_position == 'right' && code_image_size_ratio > $code_image_size_limit_right
      text_position = 'below'
    end

    # If the text position is "right" and the code type is "bar_code",
    # set the text position to "below"
    if text_position == 'right' && code_type == 'bar_code'
      text_position = 'below'
    end

    super(
      page_size: page_size(type, width, code_type, code_image_size_ratio, display_sample, name, short_label, external_label, molecule_name, ratio, code_log, text_position, image_ratio),
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
      move_down $margin * ratio

      # Depending on the code_type, generate the corresponding the corresponding code
      case code_type
      when 'qr_code'
        # Generate the QR code itself
        qr_code(element, width, ratio, code_image_size_ratio, text_position)
        if text_position == 'right'
          move_cursor_to self.bounds.top - $margin * ratio
        end
      when 'bar_code'
        # Generate the barcode itself
        bar_code(element, ratio, code_image_size_ratio)
        text_box element.code_log.value_sm, bar_code_label_options(width, ratio, code_image_size_ratio)
        move_down $text_offset.mm * ratio
      when 'data_matrix'
        # Generate the data matrix itself
        data_matrix(element, width, ratio, code_image_size_ratio, text_position)
        if text_position == 'right'
          move_cursor_to self.bounds.top - $margin * ratio
        end
      end
      # Draw the name of the element if necessary
      if name == 'true' && element.name
        # Draw the name of the element
        text_box element.name, text(ratio, text_position)[:text]
        move_down $text_offset.mm * ratio
      end
      # Draw the short label of the element if necessary
      if short_label == 'true' && element.short_label
        # Draw the short label of the element
        text_box element.short_label, text(ratio, text_position)[:text]
        move_down $text_offset.mm * ratio
      end
      # Draw the external label of the element if necessary
      if external_label == 'true' && type == 'sample' && element.external_label
        # Draw the external label of the element
        text_box element.external_label, text(ratio, text_position)[:text]
        move_down $text_offset.mm * ratio
      end
      # Draw the code log of the element if necessary
      if code_log == 'true' && element.code_log
        # Draw the code log of the element
        text_box element.code_log.id, text(ratio, text_position)[:text]
        move_down $text_offset.mm * ratio
      end
      # Draw the showed name of the element if necessary
      if molecule_name == 'true' && type == 'sample' && element.showed_name
        # Draw the showed name of the element
        text_box element.showed_name, text(ratio, text_position)[:text]
        move_down $text_offset.mm * ratio * 1.5
      end
      # Draw the sample if necessary
      if display_sample == 'true' && image
        svg open(image), sample_option(ratio)
        move_down $sample_sgv_offset.mm
      end
      # Draw the bounds of the current page
      stroke_bounds
    end
  end

  private

  def get_svg_dimensions(blob_url)
    # Read the SVG content from the blob URL
    svg_content = URI.open(blob_url).read
    # Parse the SVG content using Nokogiri
    doc = Nokogiri::XML(svg_content)
    # Extract the width and height attributes from the SVG element
    svg_width = doc.at_css('svg')['width']
    svg_height = doc.at_css('svg')['height']
    # Calculate and return the width divided by the height
    if svg_width && svg_height
      svg_width.to_f / svg_height.to_f
    end
  end

  # Generate the size of the page
  def page_size(type, width, code_type, code_image_size_ratio, display_sample, name = nil, short_label = nil, external_label = nil, molecule_name = nil, ratio, code_log, text_position, image_ratio)
    height = 2
    # Add the height of the code image if it is a QR code or data matrix and the text position is not right
    if code_type && text_position != 'right'
      if code_type == 'qr_code' || code_type == 'data_matrix'
        height += 18 * code_image_size_ratio
      elsif code_type == 'bar_code'
        height += 12 * code_image_size_ratio
      end
    end
    # Add the height of the sample image if it is displayed
    if display_sample == 'true'
      height += $sample_sgv_offset / image_ratio
    end
    # Add the height of the name text if it is displayed
    if name == 'true'
      height += $text_offset
    end
    # Add the height of the short label text if it is displayed
    if short_label == 'true'
      height += $text_offset
    end
    # Add the height of the external label text if it is displayed
    if external_label == 'true' && type == 'sample'
      height += $text_offset
    end
    # Add the height of the molecule name text if it is displayed
    if molecule_name == 'true'  && type == 'sample'
      height += $text_offset * 1.5
    end
    # Add the height of the code log text if it is displayed
    if code_log == 'true'
      height += $text_offset
    end

    [width.to_f.mm, (height.to_f * ratio).mm]
  end

    # Generates the options for the sample image.
  def sample_option(ratio)
      {width: 18.mm * ratio, height: 18.mm * ratio, at: [2 * ratio, cursor], overflow: :shrink_to_fit}
  end

  # Generates the options for the text
  def text(ratio, text_position)
    if text_position == 'right'
      { text: { at: [20 * ratio, cursor], size: 3 * ratio, overflow: :shrink_to_fit } }
    else
      { text: { at: [5 * ratio, cursor], size: 3 * ratio, overflow: :shrink_to_fit } }
    end
  end

  def qr_code_options(width, ratio, code_image_size_ratio, text_position)
    if text_position == 'right'
      { height: 50 * ratio * code_image_size_ratio, width: 50 * ratio * code_image_size_ratio, margin: 0, at: [3 * ratio, cursor] }
    else
      { height: 50 * ratio * code_image_size_ratio, width: 50 * ratio * code_image_size_ratio, margin: 0, at: [(width.to_f / 2).mm - 50 * (ratio.to_f / 2)  * code_image_size_ratio, cursor] }
    end
  end

  def qr_code(element, width, ratio, code_image_size_ratio, text_position)
    qr_code = Barby::QrCode.new(element.code_log.value, size: 1, level: :l)
    outputter = outputter(qr_code)
    svg outputter.to_svg(qr_code_options(width, ratio, code_image_size_ratio, text_position)), qr_code_options(width, ratio, code_image_size_ratio, text_position)
    move_down $qr_code_offset * ratio * code_image_size_ratio
  end

  def bar_code_label_options(width, ratio, code_image_size_ratio)
    {at: [((width.to_f / 2 - 3 * ratio ) * code_image_size_ratio).mm, cursor], size: 3 * ratio}
  end

  def bar_code_options(ratio, code_image_size_ratio)
    { height: 4.mm * ratio * code_image_size_ratio, width: 17.mm * ratio * code_image_size_ratio, margin: 0, xdim: 0.12.mm * ratio * code_image_size_ratio, at: [4 * ratio, cursor] }
  end

  def bar_code(element, ratio, code_image_size_ratio)
    outputter = outputter(Barby::Code128C.new(element.code_log.value_sm))
    svg outputter.to_svg(bar_code_options(ratio, code_image_size_ratio)), bar_code_options(ratio, code_image_size_ratio)
    move_down $bar_code_offset * ratio
  end

  def data_matrix_options(width, ratio, code_image_size_ratio, text_position)
    if text_position == 'right'
      { height: 50 * ratio * code_image_size_ratio, width: 50 * ratio * code_image_size_ratio, margin: 0, at: [3 * ratio, cursor] }
    else
      { height: 50 * ratio * code_image_size_ratio, width: 50 * ratio * code_image_size_ratio, margin: 0, at: [(width.to_f / 2).mm - 6.mm * (ratio / 2), cursor] }
    end
  end

  def data_matrix(element, width, ratio, code_image_size_ratio, text_position)
    outputter = outputter(Barby::DataMatrix.new(element.code_log.value))
    svg outputter.to_svg(data_matrix_options(width, ratio, code_image_size_ratio, text_position)), data_matrix_options(width, ratio, code_image_size_ratio, text_position)
    move_down $data_matrix_code_offset * ratio * code_image_size_ratio
  end

  def outputter(code)
    Barby::SvgOutputter.new(code)
  end
end
