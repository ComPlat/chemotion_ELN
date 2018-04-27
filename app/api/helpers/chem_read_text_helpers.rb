# frozen_string_literal: true

# Helpers function for manipulate extracted text from CDX
module ChemReadTextHelpers
  extend Grape::API::Helpers

  yml_path = Rails.root + 'lib/cdx/parser/abbreviations.yaml'
  ABB = YAML.safe_load(File.open(yml_path))

  # @ad = OpenBabel::AliasData.new

  # Expand any aliases after molecule constructed
  # def expand_mol(mol, atom, cid, alias_text)
  #   return if alias_text.empty?
  #   @ad.set_alias(alias_text)
  #   # Make chemically meaningful, if possible.
  #   is_expanded = @ad.expand(mol, atom.get_idx)
  #   return if is_expanded
  #   @textmap[cid] = {
  #     text: alias_text,
  #     x: atom.get_vector.get_x,
  #     y: atom.get_vector.get_y
  #   }
  # end

  def join_words
    %w[and with plus]
  end

  def ending_regex
    '(\s|,|;|\n|\r|\)|\]|\.|\z|$)'
  end

  def beginning_regex
    '(\s|,|;|\n|\r|\(|\[|\.|\A|^)'
  end

  def unicode(uni_str)
    uni_str.encode(Encoding::UTF_8)
  end

  def degree_regex
    degree = unicode("\u00B0")
    dcelcius = unicode("\u2103")
    dfarenheit = unicode("\u2109")

    "((#{degree} *(C|F))|(#{dcelcius}|#{dfarenheit}))"
  end

  def range_regex
    hyphen1 = unicode("\u002D")
    hyphen2 = unicode("\u2010")
    minus = unicode("\u2212")
    ndash = unicode("\u2013")
    mdash = unicode("\u2014")

    "(#{hyphen1}|#{hyphen2}|#{minus}|#{ndash}|#{mdash}|~|to|till|until)"
  end

  def range_number_regex(unit_regex, can_negative)
    sign = can_negative ? '-?\\s*' : ''
    real_number = '(\d+|\d+\.\d+)'

    "#{sign}(#{real_number}\\s*#{unit_regex}?\\s*" \
    "#{range_regex})?#{real_number}\\s*#{unit_regex}"
  end

  def expand_abb(obj)
    smis = []

    ABB.each_key do |k|
      regex = Regexp.new("#{beginning_regex}#{Regexp.escape(k)}#{ending_regex}", true)
      next unless obj[:text] =~ regex
      smis.push(ABB[k])
    end

    smis.uniq
  end

  def time_duration_range_regex
    day = '(days?|dy|d)'
    hour = '(hours?|hrs?|h)'
    minute = '(minutes?|mins?|m)'
    second = '(seconds?|secs?|s)'

    real_number = '(\d+|\d+\.\d+)'
    join_regex = "(#{join_words.join('|')})"
    time_unit = "(#{day}|#{hour}|#{minute}|#{second})"

    time_regex = "(#{real_number}\\s*#{time_unit}?)"
    linker_regex = "(#{range_regex}|#{join_regex})"
    duration_regex = "(#{time_regex}?\\s*(#{linker_regex}\\s*)?(#{real_number}\\s*#{time_unit}))"

    /#{beginning_regex}+#{duration_regex}#{ending_regex}+/i
  end

  def extract_time_info(obj)
    matches = []

    obj[:text].scan(time_duration_range_regex) do
      matches << Regexp.last_match[2]
    end

    ovn_regex = 'overnight|ovn|o/n'
    m = obj[:text].match(/#{beginning_regex}+(#{ovn_regex}?)#{ending_regex}+/i)
    matches << '12h ~ 20h' unless m.nil? || m[0].empty?

    obj[:time] = matches.join(';') unless matches.size.zero?
  end

  def extract_text_info(obj)
    unless obj[:text].encoding == Encoding::UTF_8
      t = obj[:text].force_encoding(Encoding::CP1252).encode(Encoding::UTF_8)
      obj[:text] = t
    end

    yield_regex_str = range_number_regex('%', false)
    yield_regex = /#{beginning_regex}+#{yield_regex_str}#{ending_regex}+/
    text_regex(obj, yield_regex, 'yield')

    extract_temperature(obj)
    extract_time_info(obj)
  end

  def extract_temperature(obj)
    temperature_regex_str = range_number_regex(degree_regex, true)
    temperature_regex = /#{beginning_regex}+#{temperature_regex_str}#{ending_regex}+/

    text_regex(obj, temperature_regex, 'temperature')

    m = obj[:text].match(/#{beginning_regex}+r\.?t\.?#{ending_regex}+/i)
    return if m.nil? || m[0].empty?

    degree = unicode("\u00B0")
    temp = obj[:temperature].nil? ? '' : "#{obj[:temperature]};"
    obj[:temperature] = temp + "20#{degree}C ~ 25#{degree}C"
  end

  def text_regex(obj, regex, field)
    m = obj[:text].match(regex)
    return if m.nil?
    matched = m[0]
    return if matched.empty?

    obj[field.to_sym] = remove_begin_trailing(matched)
  end

  def remove_begin_trailing(str)
    str.gsub(/#{ending_regex}/, ' ').gsub(/#{beginning_regex}/, ' ').strip
  end
end
