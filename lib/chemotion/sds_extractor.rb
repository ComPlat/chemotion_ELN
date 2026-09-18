# frozen_string_literal: true

require 'open3'
require 'tempfile'

module Chemotion
  # Reads an already-saved SDS PDF and returns only what the sheet states unambiguously.
  # Every omission is recorded under 'diagnostics' rather than replaced by a guess.
  class SdsExtractor
    GHOSTSCRIPT = ['gs', '-q', '-dNOPAUSE', '-dBATCH', '-dSAFER', '-sDEVICE=txtwrite'].freeze
    VENDORS = [
      {
        'name' => 'merck',
        'style' => :sigma,
        'marks' => [/The life science business of Merck/i, /MilliporeSigma/i, /Sigma-?Aldrich/i],
        'regulation' => %r{REGULATION\s+\(EC\)\s+No\.?\s+1272/2008}i,
      },
      {
        'name' => 'thermofisher',
        'style' => :fisher,
        'marks' => [/Thermo\s+Fisher\s+Scientific/i, /Fisher\s+Scientific/i,
                    /Acros\s+Organics/i, /Alfa\s+Aesar/i],
        'regulation' => /29\s+CFR\s+1910\.1200|\bOSHA\b/i,
      },
    ].freeze
    REGULATION_WEIGHT = 3
    MIN_VENDOR_SCORE = 3
    HAZARDS_SECTION = 2
    PROPERTIES_SECTION = 9
    LABEL_ELEMENTS = { sigma: /\A2\.2\b/, fisher: /\ALabel\s+Elements\b/i }.freeze
    SUBSECTION_END = { sigma: /\A2\.3\b/, fisher: /\AHazards\s+not\s+otherwise\s+classified/i }.freeze
    REDUCED_LABELLING = /\AReduced\s+Label/i.freeze
    NOT_HAZARDOUS = /not\s+a\s+hazardous\s+(substance|mixture)/i.freeze

    def self.extract(pdf_path)
      new(pdf_path).extract
    end

    def initialize(pdf_path)
      @pdf_path = pdf_path.to_s
      @diagnostics = { 'notes' => [], 'errors' => [] }
    end

    def extract
      lines = text_lines
      return result({}) if lines.nil?

      vendor = detect_vendor(lines.join("\n"))
      return result({}) if vendor.nil?

      sections = SdsSections.new(lines, vendor['style'])
      @diagnostics['sections_found'] = sections.found
      result(properties(sections), phrases(sections, vendor['style']))
    end

    private

    def result(properties, phrases = empty_phrases)
      { 'safetyPhrases' => phrases, 'properties' => properties, 'diagnostics' => @diagnostics }
    end

    def empty_phrases
      { 'h_statements' => {}, 'p_statements' => {}, 'pictograms' => [] }
    end

    def properties(sections)
      lines = sections.lines_of(PROPERTIES_SECTION)
      if lines.nil?
        note("section 9 heading #{sections.ambiguous?(PROPERTIES_SECTION) ? 'matched twice' : 'not found'}")
        return {}
      end

      parsed, diagnostics = SdsPropertyParser.new(lines).parse
      @diagnostics['properties'] = diagnostics
      parsed
    end

    def phrases(sections, style)
      lines = label_element_lines(sections, style)
      return empty_phrases if lines.nil?

      h_codes = SdsPhraseParser.codes(lines, 'H')
      p_codes = SdsPhraseParser.codes(lines, 'P')
      note(empty_reason(lines)) if (h_codes + p_codes).empty?
      note('pictograms are images; the text layer carries no GHS codes')
      statements(h_codes, p_codes)
    end

    def empty_reason(lines)
      return 'the sheet declares the substance non-hazardous, so no codes are expected' \
        if lines.any? { |line| line.match?(NOT_HAZARDOUS) }

      'no H or P codes in the text layer of the bounded section'
    end

    def statements(h_codes, p_codes)
      phrases = { 'h_statements' => ChemicalsService.construct_h_statements(h_codes),
                  'p_statements' => ChemicalsService.construct_p_statements(p_codes),
                  'pictograms' => ChemicalsService.construct_pictograms([]) }
      known = phrases['h_statements'].keys + phrases['p_statements'].keys
      @diagnostics['phrases'] = { 'h_codes' => h_codes, 'p_codes' => p_codes,
                                  'unknown_codes' => (h_codes + p_codes) - known }
      phrases
    end

    # Section 2.2 only: section 3 lists the components' own codes and section 16 glosses them.
    def label_element_lines(sections, style)
      section = sections.lines_of(HAZARDS_SECTION)
      if section.nil?
        note("section 2 heading #{sections.ambiguous?(HAZARDS_SECTION) ? 'matched twice' : 'not found'}")
        return nil
      end

      bounded = subsection(section, style)
      reduced = bounded.index { |line| line.strip.match?(REDUCED_LABELLING) }
      note('label elements truncated at the reduced labelling block') if reduced
      reduced ? bounded[0...reduced] : bounded
    end

    def subsection(section, style)
      first = section.index { |line| line.strip.match?(LABEL_ELEMENTS.fetch(style)) }
      if first.nil?
        note('label elements sub-heading not found; scanning the whole of section 2')
        return section
      end

      last = section[first..].index { |line| line.strip.match?(SUBSECTION_END.fetch(style)) }
      last ? section[first, last] : section[first..]
    end

    def detect_vendor(text)
      scored = VENDORS.map { |vendor| [vendor, score(vendor, text)] }.sort_by { |_, points| -points }
      best, points = scored.first
      @diagnostics['vendor_scores'] = scored.to_h { |vendor, value| [vendor['name'], value] }
      if points < MIN_VENDOR_SCORE || points == scored.dig(1, 1)
        note('vendor fingerprint inconclusive')
        return nil
      end

      @diagnostics['vendor'] = best['name']
      best
    end

    def score(vendor, text)
      marks = vendor['marks'].count { |mark| text.match?(mark) }
      marks + (text.match?(vendor['regulation']) ? REGULATION_WEIGHT : 0)
    end

    def text_lines
      return fail_with("no such file: #{@pdf_path}") unless File.file?(@pdf_path)

      text = ghostscript_text
      return fail_with('ghostscript produced no text') if text.nil? || text.strip.empty?

      text.delete("\r").tr("\f", "\n").split("\n")
    end

    def ghostscript_text
      Tempfile.create(['sds', '.txt']) do |out|
        _stdout, stderr, status = Open3.capture3(*GHOSTSCRIPT, "-sOutputFile=#{out.path}", @pdf_path)
        next fail_with("ghostscript failed: #{stderr.lines.first.to_s.strip}") unless status.success?

        File.read(out.path, encoding: 'UTF-8').scrub
      end
    rescue SystemCallError => e
      fail_with("ghostscript unavailable: #{e.message}")
    end

    def fail_with(message)
      @diagnostics['errors'] << message
      nil
    end

    def note(message)
      @diagnostics['notes'] << message
    end
  end
end
