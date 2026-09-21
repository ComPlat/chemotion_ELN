# frozen_string_literal: true

module Chemotion
  # Pictograms are images in an SDS, with no text layer and no alt text, so they cannot be
  # read off the page. They are instead derived from the hazard codes, which CLP Annex I
  # maps to pictograms one way. Derived, not read: the caller marks them as such.
  class SdsPictograms
    # Hazard code => pictogram, from Regulation (EC) 1272/2008 Annex I.
    BY_CODE = {
      'GHS01' => %w[H200 H201 H202 H203 H204 H205 H240 H241],
      'GHS02' => %w[H220 H221 H222 H223 H224 H225 H226 H228 H241 H242 H250 H251 H252 H260 H261],
      'GHS03' => %w[H270 H271 H272],
      'GHS04' => %w[H280 H281],
      'GHS05' => %w[H290 H314 H318],
      'GHS06' => %w[H300 H301 H310 H311 H330 H331],
      'GHS07' => %w[H302 H312 H315 H317 H319 H332 H335 H336],
      'GHS08' => %w[H304 H334 H340 H341 H350 H351 H360 H361 H370 H371 H372 H373],
      'GHS09' => %w[H400 H410 H411],
    }.freeze

    # The codes behind a GHS07 that Article 26 can suppress.
    SKIN_EYE_IRRITATION = %w[H315 H319].freeze
    SKIN_SENSITISATION = %w[H317].freeze
    RESPIRATORY_SENSITISATION = 'H334'

    def initialize(hazard_codes)
      @codes = Array(hazard_codes).flat_map { |code| code.to_s.upcase.split('+') }.map(&:strip).uniq
    end

    # Nothing to derive from is an empty list, not a guess.
    def codes
      return [] if @codes.empty?

      apply_precedence(BY_CODE.select { |_, codes| (codes & @codes).any? }.keys)
    end

    private

    # Article 26: a stronger pictogram removes the weaker one that says the same thing.
    def apply_precedence(found)
      found -= ['GHS07'] if found.include?('GHS06') || suppressed_by_corrosion?(found)
      found -= ['GHS07'] if suppressed_by_sensitisation?(found)
      found
    end

    def suppressed_by_corrosion?(found)
      found.include?('GHS05') && (@codes & (SKIN_EYE_IRRITATION + SKIN_SENSITISATION)) == (@codes & ghs07_codes)
    end

    def suppressed_by_sensitisation?(found)
      return false unless found.include?('GHS08') && @codes.include?(RESPIRATORY_SENSITISATION)

      ((@codes & ghs07_codes) - SKIN_EYE_IRRITATION - SKIN_SENSITISATION).empty?
    end

    def ghs07_codes
      BY_CODE['GHS07']
    end
  end
end
