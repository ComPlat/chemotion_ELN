# frozen_string_literal: true

module QuillUtils
  # desc: convert quill delta ops to html or plain text
  # without_image: remove image and file-attachment inserts from quill ops
  #   string. Both have no plain-text representation; keeping them just adds
  #   bytes to the payload sent to the Node bridge for no downstream benefit.
  def convert(content, without_image: true)
    # avoid spwaning a nodejs process if the content is empty
    return '' if blank_ops?(content)

    input = parse_input(content)
    input = filter_image(input) if without_image

    # prepare and convert input as file if input too large (`ulimit -s` is usually 8192)
    file = nil
    if input.to_s.size > 4000
      file = input_as_file(input)
      return new.convert_from_file(file.path)
    end

    new.convert(input)
  ensure
    file&.close!
  end

  private

  # rubocop:disable Style/StringLiterals

  # desc: check for empty quill delta ops
  def blank_ops?(content)
    return true if content.blank?
    return true if [{ "ops" => [{ "insert" => "" }] }, { "ops" => [{ "insert" => "\n" }] }].include?(content)

    ["{\"ops\":[{\"insert\":\"\"}]}", "{\"ops\":[{\"insert\":\"\\n\"}]}"].include?(content)
  end

  # rubocop:enable Style/StringLiterals

  # desc: return the quill delta as string
  def parse_input(delta_ops)
    delta_ops = JSON.parse delta_ops if delta_ops.is_a?(String)
    delta_ops = case delta_ops.class.name
                when 'Array'
                  delta_ops.to_json
                when 'Hash', 'ActiveSupport::HashWithIndifferentAccess', 'Hashie::Mash'
                  delta_ops.fetch('ops', []).to_json
                else
                  '[]'
                end
    # remove blank inserts that can break the conversion
    delta_ops.gsub('{"insert":""},', '').gsub('{"insert":""}]', ']')
  end

  # remove image and file-attachment inserts from quill ops string.
  # Handles three shapes:
  #   - legacy raw URL:    {"insert":{"image":"data:image/png;base64,..."}}
  #   - attachment image:  {"insert":{"image":{"attachment_identifier":"...","filename":"..."}}}
  #   - attachment file:   {"insert":{"file":{"attachment_identifier":"...","filename":"..."}},"attributes":{...}}
  def filter_image(delta_string)
    delta_string
      .gsub(/\{"insert":\{"image":"[^"]*"\}\},?/, '')
      .gsub(/\{"insert":\{"image":\{[^}]*\}\}\},?/, '')
      .gsub(/\{"insert":"[^"]*","attributes":\{"attachment-file":\{[^}]*\}\}\},?/, '')
      .sub(/,\]$/, ']')
  end

  def input_as_file(input)
    temp = Tempfile.new('input', encoding: 'UTF-8')
    temp.write(input)
    temp.rewind
    temp
  end
end
