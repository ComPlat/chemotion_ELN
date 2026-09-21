# frozen_string_literal: true

module Chemotion
  # Indexes the 16 GHS section headings of an SDS so a scan can be bounded to one of them.
  class SdsSections
    HEADINGS = {
      sigma: /\A(?:SECTION|ABSCHNITT)\s+(\d{1,2})\s*:\s*(\S.*)\z/,
      fisher: /\A(\d{1,2})\.\s+(\S.*)\z/,
    }.freeze
    MAX_SECTION = 16

    def initialize(lines, style)
      @lines = Array(lines)
      @pattern = HEADINGS.fetch(style)
    end

    # nil when the heading is missing or appears more than once.
    def lines_of(number)
      return nil if headings[number].nil? || ambiguous?(number)

      first = headings[number][:index] + 1
      last = following_index(number) - 1
      first > last ? [] : @lines[first..last]
    end

    def ambiguous?(number)
      candidates.many? { |candidate| candidate[:num] == number }
    end

    def title(number)
      headings[number]&.fetch(:title)
    end

    def found
      headings.keys.sort
    end

    private

    def following_index(number)
      later = headings.keys.select { |num| num > number }.min
      later ? headings[later][:index] : @lines.length
    end

    # Only a run 1, 2, 3, ... counts, so a numbered list inside the body cannot pose as a heading.
    def headings
      @headings ||= candidates.each_with_object({}) do |candidate, chain|
        chain[candidate[:num]] = candidate if candidate[:num] == chain.length + 1
      end
    end

    def candidates
      @candidates ||= @lines.each_with_index.filter_map do |line, index|
        match = line.strip.match(@pattern)
        next if match.nil?

        number = match[1].to_i
        next unless number.between?(1, MAX_SECTION)

        { num: number, index: index, title: match[2].strip }
      end
    end
  end
end
