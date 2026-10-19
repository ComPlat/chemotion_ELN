# frozen_string_literal: true

module Chemotion
  # Pictograms are images in an SDS, with no text layer and no alt text, so they cannot be
  # read off the page. They are instead derived from the hazard codes, which CLP Annex I
  # maps to pictograms one way. Derived, not read: the caller marks them as such.
  class SdsPictograms
    # Pictogram => hazard codes, from Regulation (EC) 1272/2008 Annex I. H205 and H221 are left
    # out: one category they label has no pictogram, so the code alone does not settle it.
    BY_CODE = {
      'GHS01' => %w[H200 H201 H202 H203 H204 H240 H241],
      'GHS02' => %w[H206 H207 H208 H220 H222 H223 H224 H225 H226 H228 H232 H241 H242 H250 H251 H252
                    H260 H261],
      'GHS03' => %w[H270 H271 H272],
      'GHS04' => %w[H280 H281],
      'GHS05' => %w[H290 H314 H318],
      'GHS06' => %w[H300 H301 H310 H311 H330 H331],
      'GHS07' => %w[H302 H312 H315 H317 H319 H332 H335 H336 H420],
      'GHS08' => %w[H304 H334 H340 H341 H350 H351 H360 H361 H370 H371 H372 H373],
      'GHS09' => %w[H400 H410 H411],
    }.freeze

    # The GHS07 codes Article 26(1) lets a stronger pictogram stand in for.
    SKIN_EYE_IRRITATION = %w[H315 H319].freeze
    SKIN_SENSITISATION = %w[H317].freeze
    RESPIRATORY_SENSITISATION = 'H334'
    # The category letters of H350i, H360FD and the like do not change the pictogram.
    BASE_CODE = /\AH\d{3}/.freeze

    def initialize(hazard_codes)
      @codes = Array(hazard_codes).flat_map { |code| code.to_s.split('+') }
                                  .filter_map { |code| code.strip[BASE_CODE] }.uniq
    end

    # Nothing to derive from is an empty list, not a guess.
    def codes
      return [] if @codes.empty?

      found = BY_CODE.select { |_, codes| (codes & @codes).any? }.keys
      ghs07_needed?(found) ? found : found - ['GHS07']
    end

    private

    # Article 26(1): GHS06 always replaces GHS07; GHS05 replaces it for skin and eye irritation;
    # GHS08 for respiratory sensitisation replaces it for skin sensitisation and irritation.
    def ghs07_needed?(found)
      return false if found.include?('GHS06')

      reasons = @codes & BY_CODE['GHS07']
      reasons -= SKIN_EYE_IRRITATION if found.include?('GHS05')
      reasons -= SKIN_EYE_IRRITATION + SKIN_SENSITISATION if @codes.include?(RESPIRATORY_SENSITISATION)
      reasons.any?
    end
  end
end
