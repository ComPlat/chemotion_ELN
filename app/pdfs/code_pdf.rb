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

# rubocop:disable Metrics/ClassLength
class CodePdf < Prawn::Document
  CODE_IMAGE_SIZE_LIMIT_RIGHT = 0.3
  SAMPLE_SVG_OFFSET = 20
  SAMPLE_NAME_OFFSET = 10
  BAR_CODE_OFFSET = 1.5
  DATA_MATRIX_CODE_OFFSET = QR_CODE_OFFSET = MARGIN = 5
  TEXT_OFFSET = 4
  CODE_TYPES = %w[qr_code bar_code data_matrix_code].freeze
  BAR_CODE = CODE_TYPES[1].freeze
  TEXT_POSITION_TYPES = %w[below right].freeze
  ELEMENTS_TYPES = %w[sample reaction].freeze

  attr_reader :elements, # list of elements to be displayed
              :code_type, # type of code to be displayed, one of CODE_TYPES
              :code_image_size, # size of the code image
              :width, # Float: width of the page in mm
              :type, # type of the element, one of 'sample' or 'reaction' ..
              :display_sample, # Boolean: display the sample image
              :name, # Boolean: display the name property of the element
              :short_label, # Boolean: display the short label property of the element
              :external_label, # Boolean: display the external label property of the element
              :molecule_name, # Boolean: display the molecule name property of the element
              :code_log, # Boolean: display the code log value of the element
              :text_position, # position of the text one of "below" or "right" TEXT_POSITION_TYPES
              :code_image_size_ratio, # ratio of the code image size
              :image_data # image data of the element

  # Initializes a new CodePdf object.
  # @return [CodePdf] a new CodePdf object
  def initialize(elements, **options)
    @elements = elements
    @code_type = determine_code_type(options)
    @code_image_size = options.fetch(:code_image_size, 0)
    @width = options.fetch(:width, 0)
    @type = options.fetch(:element_type, nil)
    @display_sample = options.fetch(:display_sample, false) if type == ELEMENTS_TYPES.first
    @name = options.fetch(:name, false)
    @short_label = options.fetch(:short_label, false)
    @external_label = options.fetch(:external_label, false)
    @molecule_name = options.fetch(:molecule_name, false)
    @code_log = options.fetch(:code_log, false)
    @text_position = options.fetch(:text_position, TEXT_POSITION_TYPES.first)
    @image_data = image_data_getter if display_sample
    code_image_size_and_ratio

    super(
      page_size: page_size,
      margin: [0, 0, 0, 0],
    )
    iterate
  end

  def determine_code_type(options)
    options[:code_type].in?(CODE_TYPES) ? options[:code_type] : CODE_TYPES.first
  end

  # Sets the code image size and ratio based on the code type and the given code image size.
  # Sets the text position based on the code image size ratio and code type.
  # @return [void]
  def code_image_size_and_ratio
    @code_image_size = code_type == BAR_CODE ? 100 : 30 if code_image_size.to_f > 100 || code_image_size.to_f.negative?
    @code_image_size_ratio = code_image_size.to_f / 100
    @text_position = 'below' if @code_image_size_ratio > CODE_IMAGE_SIZE_LIMIT_RIGHT || code_type == BAR_CODE
  end

  # Iterates through each element and formats it on the page.
  # @return [void]
  def iterate
    element = elements.first
    format_text(element)
    move_down MARGIN * ratio
    display_code(element)
    handle_text(element)
    print_sample if display_sample && type == ELEMENTS_TYPES.first
    # Draw the bounds of the current page
    stroke_bounds
  end

  def handle_text(element)
    values = [
      [element.name, name],
      [element.code_log&.id, code_log],
    ]

    if type == ELEMENTS_TYPES.first
      values << [element.short_label, short_label]
      values << [element.external_label, external_label]
      values << [element.showed_name, molecule_name]
    end

    values.compact.each { |value, condition| print_text(value) if condition }
  end

  # Formats the given element into a human-readable string.
  # @param element [Object] The element to format.
  # @return [String] A formatted string representation of the element.
  def format_text(element)
    if type.in?(ELEMENTS_TYPES)
      "#{type.capitalize}: #{element.short_label}\n#{element.name}"
    else
      "#{type.capitalize} ID: #{element.id}\n#{element.name}"
    end
  end

  # Displays the corresponding code based on the code_type.
  # @param element [Object] The element to generate the code for.
  # @return [void]
  def display_code(element)
    case code_type
    when 'qr_code'
      display_qr_code(element)
    when 'bar_code'
      display_bar_code(element)
    when 'data_matrix_code'
      display_data_matrix(element)
    end
  end

  # Generates and displays a QR code for the given element.
  # @param element [Object] The element to generate the QR code for.
  # @return [void]
  def display_qr_code(element)
    # Generate the QR code itself
    qr_code(element, @width, @code_image_size_ratio, @text_position)
    move_cursor_to bounds.top - (MARGIN * ratio) if @text_position == 'right'
  end

  # Generates and displays a bar code for the given element.
  # @param element [Object] The element to generate the bar code for.
  # @return [void]
  def display_bar_code(element)
    # Generate the barcode itself
    bar_code(element, @code_image_size_ratio)
    text_box element.code_log.value_sm, bar_code_label_options(@width, @code_image_size_ratio)
    move_down TEXT_OFFSET.mm * ratio
  end

  # Displays a data matrix for the given element.
  # @param element [Object] The element to generate the data matrix code for.
  # @return [void]
  def display_data_matrix(element)
    # Generate the data matrix itself
    data_matrix(element, @width, @code_image_size_ratio, @text_position)
    move_cursor_to bounds.top - (MARGIN * ratio) if @text_position == 'right'
  end

  private

  # Prints the name of the element on the page if necessary.
  # @param element_name [String] The name of the element to print.
  # @return [void]
  def print_text(element_name)
    # Return early if name and element_name are not both truthy
    return unless element_name

    # Draw the name of the element
    text_box element_name, text(@text_position)[:text]
    move_down TEXT_OFFSET.mm * ratio
  end

  # Prints the sample image on the page if necessary.
  # @return [void]
  def print_sample
    return unless display_sample

    # Draw the sample if necessary
    svg(File.read(image_data_getter.last), sample_option)
    move_down SAMPLE_SVG_OFFSET.mm
  end

  # Returns the width, height and URL of the SVG image associated with the first element.
  # @param elements [Array] The elements to get the data from.
  # @return [Array<String, String, [String, Pathname]>] An array containing the width, height and URL of the SVG image.
  # @note returns a dummy image if the SVG file does not exist or if an error occurs.
  def image_data_getter
    element = elements.first
    full_svg_path = element.respond_to?(:full_svg_path, true) ? element.send(:full_svg_path) : nil
    return dummy_image if full_svg_path.nil? || !File.exist?(full_svg_path)

    # Extract the width and height attributes from the SVG element
    extract_svg_size(full_svg_path)
  end

  # Extracts the width and height of the SVG image from the given path.
  # @param svg_path [String, Pathname] The path to the SVG file.
  # @return [Array<String, String, [String, Pathname]>] An array containing
  #   the width and height of the SVG image and the path.
  # @note This method rescues any StandardError that occurs during the extraction process
  #  and returns a dummy image if an error occurs.
  def extract_svg_size(svg_path)
    doc = Nokogiri::XML(File.read(svg_path))
    [doc.at_css('svg')['width'], doc.at_css('svg')['height'], svg_path]
  rescue StandardError => error
    Rails.logger.error("Error reading SVG file: #{error.message}")
    dummy_image
  end

  def dummy_image
    @dummy_image ||= ['180', '180', Rails.public_path.join('images/wild_card/no_image_180.svg')]
  end

  # ratio use to scale the text on the PDF based on the width of the page
  # @return [Float]
  def image_ratio
    return 1 unless display_sample && type == ELEMENTS_TYPES.first

    image_data.first.to_f / image_data.second.to_i
  end

  # ratio use to scale the text on the PDF based on the width of the page
  # @return [Float]
  def ratio
    @ratio = width.to_f / 20
  end

  # Generate the size of the page. return arrays size 2 of width and height in mm
  # @return [Array(Float, Float)]
  # @example
  #  => [100, 100]
  def page_size
    base_height = 2
    additional_heights = calculate_additional_heights
    total_height = base_height + additional_heights.sum
    [width.to_f.mm, total_height.mm * ratio]
  end

  # Calculates the additional heights based on the given conditions.
  # @return [Array<Float>] An array of additional heights.
  # @example
  #  => [10.0, 5.0, 2.0, ...]
  def calculate_additional_heights
    conditions = [
      [code_type && text_position != 'right', code_image_height],
      [display_sample, SAMPLE_SVG_OFFSET / image_ratio],
      [name, TEXT_OFFSET],
      [short_label, TEXT_OFFSET],
      [external_label && type == 'sample', TEXT_OFFSET],
      [molecule_name && type == 'sample', TEXT_OFFSET * 1.5],
      [code_log, TEXT_OFFSET],
    ]

    heights = []
    conditions.each do |condition, value|
      heights << value if condition
    end

    heights
  end

  # Calculates the height of the code image based on its type.
  # @return [Float] The height of the code image.
  def code_image_height
    code_type == 'bar_code' ? 8 * code_image_size_ratio : 18 * code_image_size_ratio
  end

  # Generates the options for the sample image.
  # @return [Hash] The options for the sample image.
  def sample_option
    { width: 18.mm * ratio, height: 18.mm * ratio, at: [2 * ratio, cursor], overflow: :shrink_to_fit }
  end

  # Generates the options for the text
  # @param text_position [String] The position of the text.
  # @return [Hash] The options for the text.
  def text(text_position)
    text_margin_value = text_position == 'right' ? 20 : 5
    { text: { at: [text_margin_value * ratio, cursor], size: 3 * ratio, overflow: :shrink_to_fit } }
  end

  # Generates the QR code
  # @param element [Element] The element to generate the QR code.
  # @param width [Float] The width of the QR code.
  # @param code_image_size_ratio [Float] The ratio used to scale the code image.
  # @param text_position [String] The position of the text.
  # @return [void]
  def qr_code(element, width, code_image_size_ratio, text_position)
    qr_code = Barby::QrCode.new(element.code_log.value, size: 1, level: :l)
    outputter = outputter(qr_code)
    svg outputter.to_svg(square_code_options(width, code_image_size_ratio, text_position)),
        square_code_options(width, code_image_size_ratio, text_position)
    move_down QR_CODE_OFFSET * ratio * code_image_size_ratio
  end

  # Generates the bar code
  # @param element [Element] The element to generate the bar code.
  # @param code_image_size_ratio [Float] The ratio used to scale the code image.
  # @return [void]
  def bar_code(element, code_image_size_ratio)
    outputter = outputter(Barby::Code128C.new(element.code_log.value_sm))
    svg outputter.to_svg(bar_code_options(code_image_size_ratio)), bar_code_options(code_image_size_ratio)
    move_down BAR_CODE_OFFSET * ratio
  end

  # Generates the data matrix
  # @param element [Element] The element to generate the data matrix.
  # @param width [Float] The width of the data matrix.
  # @param code_image_size_ratio [Float] The ratio used to scale the code image.
  # @param text_position [String] The position of the text.
  # @return [void]
  def data_matrix(element, width, code_image_size_ratio, text_position)
    outputter = outputter(Barby::DataMatrix.new(element.code_log.value))
    svg outputter.to_svg(square_code_options(width, code_image_size_ratio, text_position)),
        square_code_options(width, code_image_size_ratio, text_position)
    move_down DATA_MATRIX_CODE_OFFSET * ratio * code_image_size_ratio
  end

  # Generates the options for the QR code
  # @param width [Float] The width of the QR code.
  # @param code_image_size_ratio [Float] The ratio used to scale the code image.
  # @param text_position [String] The position of the text.
  # @return [Hash] The options for the QR code.
  def square_code_options(width, code_image_size_ratio, text_position)
    options = {
      height: 50 * ratio * code_image_size_ratio,
      width: 50 * ratio * code_image_size_ratio,
      margin: 0,
    }
    right_text_options = [3 * ratio, cursor]
    below_text_options = [(width.to_f / 2).mm - (50 * (ratio.to_f / 2) * code_image_size_ratio), cursor]

    options[:at] = text_position == 'right' ? right_text_options : below_text_options

    options
  end

  # Generates the options for the bar code
  # @param width [Float] The width of the bar code.
  # @param code_image_size_ratio [Float] The ratio used to scale the code image.
  # @return [Hash] The options for the bar code.
  def bar_code_label_options(width, code_image_size_ratio)
    { at: [(((width.to_f / 2) - (3 * ratio)) * code_image_size_ratio).mm, cursor], size: 3 * ratio }
  end

  # Generates the bar code
  # @param code_image_size_ratio [Float] The ratio used to scale the code image.
  # @return [void]
  def bar_code_options(code_image_size_ratio)
    { height: 4.mm * ratio * code_image_size_ratio, width: 17.mm * ratio * code_image_size_ratio, margin: 0,
      xdim: 0.12.mm * ratio * code_image_size_ratio, at: [4 * ratio, cursor] }
  end

  def outputter(code)
    Barby::SvgOutputter.new(code)
  end
end
# rubocop:enable Metrics/ClassLength
