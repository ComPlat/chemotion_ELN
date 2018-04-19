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

  def ending_regex
    '(\s|,|\n|\r|\)|\]|\.|\z|$)'
  end

  def beginning_regex
    '(\s|,|\n|\r|\(|\[|\.|\A|^)'
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

    "(#{hyphen1}|#{hyphen2}|#{minus}|#{ndash}|#{mdash}|~)"
  end

  def range_number_regex(unit_regex, can_negative)
    sign = can_negative ? '-?\\s*' : ''
    real_number = '(\d+|\d+\.\d+)'

    "#{sign}(#{real_number}\\s*#{unit_regex}?\\s*#{range_regex})?#{real_number}\\s*#{unit_regex}"
  end

  def expand_abb(obj)
    smis = []

    ABB.each_key do |k|
      regex = Regexp.new("#{Regexp.escape(k)}#{ending_regex}", true)
      next unless obj[:text] =~ regex
      smis.push(ABB[k])
    end

    smis.uniq
  end

  def time_regex
    day = '(days?|d)'
    hour = '(hours?|h)'
    minute = '(minutes?|mins?|m)'
    second = '(seconds?|secs?|s)'

    time_unit = "(#{day}|#{hour}|#{minute}|#{second})"
    time_regex_str = range_number_regex(time_unit, false)

    /#{beginning_regex}+#{time_regex_str}#{ending_regex}+/i
  end

  def extract_time_info(obj)
    matches = []

    obj[:text].scan(time_regex) do
      m = Regexp.last_match[0]
      matches << m.gsub(/#{ending_regex}/, ' ').strip
    end

    ovn_regex = Regexp.union(%w[overnight ovn o/n]).source
    m = obj[:text].match(/#{beginning_regex}+#{ovn_regex}?#{ending_regex}+/i)
    matches << '12h ~ 20h' unless m.nil? || m[0].empty?

    return if matches.size.zero?

    obj[:time] = matches.join(' ').gsub(/[()]/, '')
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
    obj[:temperature] = (obj[:temperature] || '') + "20#{degree}C ~ 25#{degree}C"
  end

  def text_regex(obj, regex, field)
    m = obj[:text].match(regex)
    return if m.nil?
    matched = m[0]
    return if matched.empty?

    obj[field.to_sym] = matched.gsub(/#{ending_regex}/, ' ').strip
    obj[field.to_sym] = matched.gsub(/#{beginning_regex}/, ' ').strip
  end
end
