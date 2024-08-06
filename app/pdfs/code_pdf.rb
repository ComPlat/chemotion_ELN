# frozen_string_literal: true

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
  CODE_IMAGE_SIZE_LIMIT_RIGHT = 0.3
  MARGIN = 5
  SAMPLE_SVG_OFFSET = 20
  SAMPLE_NAME_OFFSET = 10
  QR_CODE_OFFSET = 5
  BAR_CODE_OFFSET = 1.5
  DATA_MATRIX_CODE_OFFSET = 5
  TEXT_OFFSET = 3
  CODE_TYPES = %w[qr_code bar_code data_matrix_code]
  TEXT_POSITION_TYPES = %w[below right]

  attr_reader :code_type
  attr_reader :code_image_size
  attr_reader :width
  attr_reader :type
  attr_reader :display_sample
  attr_reader :name
  attr_reader :short_label
  attr_reader :external_label
  attr_reader :molecule_name
  attr_reader :code_log
  attr_reader :text_position
  attr_reader :image

  def initialize(elements, options = {})
    puts options
    @code_type = options[:code_type].in?(CODE_TYPES) ? options[:code_type] : CODE_TYPES.first
    @code_image_size = options[:code_image_size]
    @width = options[:width]
    @type = options[:element_type]
    @display_sample = options[:display_sample]
    @name = options[:name]
    @short_label = options[:short_label]
    @external_label = options[:external_label]
    @molecule_name = options[:molecule_name]
    @code_log = options[:code_log]
    @text_position = options[:text_position].in?(TEXT_POSITION_TYPES) ? options[:text_position] : TEXT_POSITION_TYPES.first
    @image = options[:image]

    # ratio use to scale the text on the PDF based on the width of the page
    image_ratio = get_svg_dimensions(@image) if @image

    # ratio use to scale the text on the PDF based on the width of the page
    ratio = @width.to_f / 20

    # code image size limit
    if @code_image_size.to_f > 100 || @code_image_size.to_f.negative?
      @code_image_size = if @code_type == 'bar_code'
                          100
                        else
                          30
                        end
    end

    @code_image_size_ratio = @code_image_size.to_f / 100

    # If the text position is "right" and the code image size ratio is greater than the limit,
    # set the text position to "below"
    @text_position = 'below' if @text_position == 'right' && @code_image_size_ratio > CODE_IMAGE_SIZE_LIMIT_RIGHT

    # If the text position is "right" and the code type is "bar_code",
    # set the text position to "below"
    @text_position = 'below' if @text_position == 'right' && @code_type == 'bar_code'

    super(
      page_size: page_size(@type, @width, @code_type, @code_image_size_ratio, @display_sample, @name, @short_label,
                           @external_label, @molecule_name, ratio, @code_log, @text_position, image_ratio),
      margin: [0, 0, 0, 0],
    )

    elements.each_with_index do |element, i|
      start_new_page unless i.zero?
      # Generate the text to be displayed on the PDF based on
      # the type of the element and its label
      text = if %w[sample reaction].include?(@type)
               "#{@type.capitalize}: #{element.short_label}\n#{element.name}"
             else
               "#{@type.capitalize} ID: #{element.id}\n#{element.name}"
             end
      move_down MARGIN * ratio

      # Depending on the code_type, generate the corresponding the corresponding code
      case code_type
      when 'qr_code'
        # Generate the QR code itself
        qr_code(element, @width, ratio, @code_image_size_ratio, @text_position)
        move_cursor_to bounds.top - (MARGIN * ratio) if @text_position == 'right'
      when 'bar_code'
        # Generate the barcode itself
        bar_code(element, ratio, @code_image_size_ratio)
        text_box element.code_log.value_sm, bar_code_label_options(@width, ratio, @code_image_size_ratio)
        move_down TEXT_OFFSET.mm * ratio
      when 'data_matrix_code'
        # Generate the data matrix itself
        data_matrix(element, @width, ratio, @code_image_size_ratio, @text_position)
        move_cursor_to bounds.top - (MARGIN * ratio) if @text_position == 'right'
      end
      # Draw the name of the element if necessary
      if @name == 'true' && element.name
        # Draw the name of the element
        text_box element.name, text(ratio, @text_position)[:text]
        move_down TEXT_OFFSET.mm * ratio
      end
      # Draw the short label of the element if necessary
      if @short_label == 'true' && element.short_label
        # Draw the short label of the element
        text_box element.short_label, text(ratio, @text_position)[:text]
        move_down TEXT_OFFSET.mm * ratio
      end
      # Draw the external label of the element if necessary
      if @external_label == 'true' && @type == 'sample' && element.external_label
        # Draw the external label of the element
        text_box element.external_label, text(ratio, @text_position)[:text]
        move_down TEXT_OFFSET.mm * ratio
      end
      # Draw the code log of the element if necessary
      if @code_log == 'true' && element.code_log
        # Draw the code log of the element
        text_box element.code_log.id, text(ratio, @text_position)[:text]
        move_down TEXT_OFFSET.mm * ratio
      end
      # Draw the showed name of the element if necessary
      if @molecule_name == 'true' && @type == 'sample' && element.showed_name
        # Draw the showed name of the element
        text_box element.showed_name, text(ratio, @text_position)[:text]
        move_down TEXT_OFFSET.mm * ratio * 1.5
      end
      # Draw the sample if necessary
      if @display_sample == 'true' && @image
        svg open(@image), sample_option(ratio)
        move_down SAMPLE_SVG_OFFSET.mm
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
    svg_width.to_f / svg_height.to_f if svg_width && svg_height
  end

  # Generate the size of the page
  def page_size(type, width, code_type, code_image_size_ratio, display_sample, name = nil, short_label = nil,
                external_label = nil, molecule_name = nil, ratio, code_log, text_position, image_ratio)
    height = 2
    # Add the height of the code image if it is a QR code or data matrix and the text position is not right
    if code_type && text_position != 'right'
      case code_type
      when 'qr_code', 'data_matrix_code'
        height += 18 * code_image_size_ratio
      when 'bar_code'
        height += 12 * code_image_size_ratio
      end
    end
    # Add the height of the sample image if it is displayed
    height += SAMPLE_SVG_OFFSET / image_ratio if display_sample == 'true'
    # Add the height of the name text if it is displayed
    height += TEXT_OFFSET if name == 'true'
    # Add the height of the short label text if it is displayed
    height += TEXT_OFFSET if short_label == 'true'
    # Add the height of the external label text if it is displayed
    height += TEXT_OFFSET if external_label == 'true' && type == 'sample'
    # Add the height of the molecule name text if it is displayed
    height += TEXT_OFFSET * 1.5 if molecule_name == 'true' && type == 'sample'
    # Add the height of the code log text if it is displayed
    height += TEXT_OFFSET if code_log == 'true'

    [width.to_f.mm, (height.to_f * ratio).mm]
  end

  # Generates the options for the sample image.
  def sample_option(ratio)
    { width: 18.mm * ratio, height: 18.mm * ratio, at: [2 * ratio, cursor], overflow: :shrink_to_fit }
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
      { height: 50 * ratio * code_image_size_ratio, width: 50 * ratio * code_image_size_ratio, margin: 0,
        at: [3 * ratio, cursor] }
    else
      { height: 50 * ratio * code_image_size_ratio, width: 50 * ratio * code_image_size_ratio, margin: 0,
        at: [(width.to_f / 2).mm - (50 * (ratio.to_f / 2) * code_image_size_ratio), cursor] }
    end
  end

  def qr_code(element, width, ratio, code_image_size_ratio, text_position)
    qr_code = Barby::QrCode.new(element.code_log.value, size: 1, level: :l)
    outputter = outputter(qr_code)
    svg outputter.to_svg(qr_code_options(width, ratio, code_image_size_ratio, text_position)),
        qr_code_options(width, ratio, code_image_size_ratio, text_position)
    move_down QR_CODE_OFFSET * ratio * code_image_size_ratio
  end

  def bar_code_label_options(width, ratio, code_image_size_ratio)
    { at: [(((width.to_f / 2) - (3 * ratio)) * code_image_size_ratio).mm, cursor], size: 3 * ratio }
  end

  def bar_code_options(ratio, code_image_size_ratio)
    { height: 4.mm * ratio * code_image_size_ratio, width: 17.mm * ratio * code_image_size_ratio, margin: 0,
      xdim: 0.12.mm * ratio * code_image_size_ratio, at: [4 * ratio, cursor] }
  end

  def bar_code(element, ratio, code_image_size_ratio)
    outputter = outputter(Barby::Code128C.new(element.code_log.value_sm))
    svg outputter.to_svg(bar_code_options(ratio, code_image_size_ratio)), bar_code_options(ratio, code_image_size_ratio)
    move_down BAR_CODE_OFFSET * ratio
  end

  def data_matrix_options(width, ratio, code_image_size_ratio, text_position)
    if text_position == 'right'
      { height: 50 * ratio * code_image_size_ratio, width: 50 * ratio * code_image_size_ratio, margin: 0,
        at: [3 * ratio, cursor] }
    else
      { height: 50 * ratio * code_image_size_ratio, width: 50 * ratio * code_image_size_ratio, margin: 0,
        at: [(width.to_f / 2).mm - (6.mm * (ratio / 2)), cursor] }
    end
  end

  def data_matrix(element, width, ratio, code_image_size_ratio, text_position)
    outputter = outputter(Barby::DataMatrix.new(element.code_log.value))
    svg outputter.to_svg(data_matrix_options(width, ratio, code_image_size_ratio, text_position)),
        data_matrix_options(width, ratio, code_image_size_ratio, text_position)
    move_down DATA_MATRIX_CODE_OFFSET * ratio * code_image_size_ratio
  end

  def outputter(code)
    Barby::SvgOutputter.new(code)
  end
end
