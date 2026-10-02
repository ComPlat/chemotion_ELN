# frozen_string_literal: true

require 'open3'
require 'tempfile'

module Chemotion
  # Reads an already-saved SDS PDF and returns only what the sheet states unambiguously.
  # Every omission is recorded under 'diagnostics' rather than replaced by a guess.
  class SdsExtractor
    # Sections 2 and 9 sit well inside the first pages; the cap bounds work on a hostile file.
    MAX_PAGES = 40
    GHOSTSCRIPT = ['gs', '-q', '-dNOPAUSE', '-dBATCH', '-dSAFER', '-sDEVICE=txtwrite',
                   '-dFirstPage=1', "-dLastPage=#{MAX_PAGES}"].freeze
    # The PDF was uploaded by a user, so a file built to keep the interpreter busy must not
    # hold a worker for longer than this.
    GHOSTSCRIPT_TIMEOUT_SECONDS = 60
    KILL_AFTER_SECONDS = 5
    # timeout(1) exits 124 after TERM and 137 when it has to KILL.
    TIMED_OUT_STATUSES = [124, 137].freeze
    # Bounds on the text layer, so every regex below runs on lines of a known size.
    MAX_TEXT_BYTES = 2_000_000
    MAX_LINE_LENGTH = 1000
    VENDORS = [
      {
        'name' => 'merck',
        'marks' => [/The life science business of Merck/i, /MilliporeSigma/i, /Sigma-?Aldrich/i],
      },
      {
        'name' => 'thermofisher',
        'marks' => [/Thermo\s+Fisher\s+Scientific/i, /Fisher\s+Scientific/i,
                    /Acros\s+Organics/i, /Alfa\s+Aesar/i],
      },
    ].freeze
    MIN_VENDOR_SCORE = 1
    HAZARDS_SECTION = 2
    PROPERTIES_SECTION = 9
    LABEL_ELEMENTS = { sigma: /\A2\.2\b/, fisher: /\ALabel\s+Elements\b/i }.freeze
    SUBSECTION_END = { sigma: /\A2\.3\b/, fisher: /\AHazards\s+not\s+otherwise\s+classified/i }.freeze
    REDUCED_LABELLING = /\A(?:Reduced\s+Label|Reduzierte\s+Kennzeichnung)/i.freeze
    NOT_HAZARDOUS = /not\s+a\s+hazardous\s+(substance|mixture)|\ANone\s+required\b|no\s+hazard\s+statement/i.freeze
    NOT_HAZARDOUS_NOTE = 'the sheet declares the substance non-hazardous, so no codes are expected'
    # The shape Chemical#chemical_data stores in safetySheetPath; nothing else reaches the disk.
    SAVED_SHEET = %r{\A/?safety_sheets/[A-Za-z0-9_-]+/[A-Za-z0-9._-]+\.pdf\z}.freeze
    SHEET_ROOT = 'safety_sheets'
    NOT_A_SAVED_SHEET = 'not a saved safety sheet path'

    def self.extract(pdf_path)
      new(pdf_path).extract
    end

    # Entry point for a link held in chemical_data, which is client-supplied.
    def self.extract_saved_sheet(link)
      link = link.to_s
      path = Rails.public_path.join(link.delete_prefix('/'))
      return new(link).refuse(NOT_A_SAVED_SHEET) unless link.match?(SAVED_SHEET) && inside_sheet_root?(path)

      extract(path.to_s)
    end

    # A symlink under the sheet folder must not lead the reader elsewhere on the disk.
    def self.inside_sheet_root?(path)
      return true unless path.exist?

      path.realpath.to_s.start_with?("#{Rails.public_path.join(SHEET_ROOT).realpath}/")
    end

    # Absolute, so ghostscript cannot read a path as an option.
    def initialize(pdf_path)
      @pdf_path = File.expand_path(pdf_path.to_s)
      @diagnostics = { 'notes' => [], 'errors' => [] }
    end

    def refuse(message)
      fail_with(message)
      result({})
    end

    def extract
      lines = text_lines
      return result({}) if lines.nil?

      vendor = detect_vendor(lines.join("\n"))
      return result({}) if vendor.nil?

      sections = SdsSections.detect(lines)
      @diagnostics['layout'] = sections.style.to_s
      @diagnostics['sections_found'] = sections.found
      result(properties(sections), phrases(sections, sections.style))
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
      return statements(h_codes, p_codes, 'codes') if (h_codes + p_codes).any?
      return phrases_from_wording(lines) unless non_hazardous?(lines)

      note(NOT_HAZARDOUS_NOTE)
      statements([], [], 'none')
    end

    def phrases_from_wording(lines)
      found = SdsPhraseMatcher.match(lines)
      h_codes, p_codes = found[:codes].partition { |code| code.match?(/\A(?:EU)?H/) }
      if found[:refused]
        note("wording not matched: #{found[:refused]}")
      elsif found[:codes].empty?
        note('no H or P codes in the text layer of the bounded section, and no statement matched')
      else
        note('the sheet prints no codes, so these were matched from the statement wording')
      end
      phrases = statements(h_codes, p_codes, 'wording')
      @diagnostics['phrases'].merge!('matched' => found[:matched], 'unmatched_statements' => found[:unmatched],
                                     'ambiguous_statements' => found[:ambiguous])
      phrases
    end

    def non_hazardous?(lines)
      lines.any? { |line| line.strip.match?(NOT_HAZARDOUS) }
    end

    def statements(h_codes, p_codes, source)
      pictograms = SdsPictograms.new(h_codes).codes
      note('pictograms are images, so these are derived from the hazard codes') if pictograms.any?
      phrases = { 'h_statements' => ChemicalsService.construct_h_statements(h_codes),
                  'p_statements' => ChemicalsService.construct_p_statements(p_codes),
                  'pictograms' => ChemicalsService.construct_pictograms(pictograms) }
      known = phrases['h_statements'].keys + phrases['p_statements'].keys
      @diagnostics['phrases'] = { 'source' => source, 'h_codes' => h_codes, 'p_codes' => p_codes,
                                  'pictograms_derived' => pictograms,
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
      vendor['marks'].count { |mark| text.match?(mark) }
    end

    def text_lines
      return fail_with("no such file: #{File.basename(@pdf_path)}") unless File.file?(@pdf_path)

      text = ghostscript_text
      return nil if text.nil?
      return fail_with('ghostscript produced no text') if text.strip.empty?

      text.delete("\r").tr("\f", "\n").split("\n").map { |line| line[0, MAX_LINE_LENGTH] }
    end

    def ghostscript_text
      Tempfile.create(['sds', '.txt']) do |out|
        _stdout, stderr, status = Open3.capture3(*ghostscript_command(out.path))
        next fail_with('ghostscript timed out') if TIMED_OUT_STATUSES.include?(status.exitstatus)
        next fail_with("ghostscript failed: #{first_line_without_paths(stderr, out.path)}") unless status.success?

        (+File.open(out.path, 'rb') { |file| file.read(MAX_TEXT_BYTES) }.to_s).force_encoding(Encoding::UTF_8).scrub
      end
    rescue SystemCallError => e
      fail_with("ghostscript unavailable: #{e.message}")
    end

    def ghostscript_command(output)
      ['timeout', '-k', KILL_AFTER_SECONDS.to_s, GHOSTSCRIPT_TIMEOUT_SECONDS.to_s,
       *GHOSTSCRIPT, "-sOutputFile=#{output}", @pdf_path]
    end

    # Diagnostics go back to the browser, so the server's file system stays out of them.
    def first_line_without_paths(stderr, output)
      stderr.lines.first.to_s.strip.gsub(@pdf_path, File.basename(@pdf_path)).gsub(output, File.basename(output))
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
