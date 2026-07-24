# frozen_string_literal: true

require 'open3'

# Extracts plain text from an SDS PDF using Ghostscript's txtwrite device,
# normalises the whitespace, then narrows the result to only the GHS sections
# relevant for safety/property extraction.
#
# Ghostscript (gs) is available in the production Docker image and is used
# here because it handles the wide variety of PDF encodings and fonts found
# in vendor SDS documents without requiring any additional Ruby gems.
#
# Strategy (single-pass, no extra LLM call):
#   1. Extract full PDF text via gs.
#   2. Normalise whitespace: collapse runs of 2+ spaces on each line to 2
#      spaces.  Vendor PDFs that use multi-column layouts (e.g. Sigma-Aldrich)
#      produce lines with hundreds of spaces; normalisation reduces token usage
#      by 55–70% on those documents without losing any information.
#   3. Detect GHS section headers using a multilingual regex
#      (English "SECTION N", German "ABSCHNITT N", French "RUBRIQUE N", etc.).
#   4. Return sections 1, 2, 3, 8, 9 joined together (≤ MAX_SECTION_CHARS).
#      Section 3 (Composition) is included because mixture SDS files store
#      component CAS numbers there — section 1 only has the mixture trade name.
#   5. If fewer than 2 relevant sections are found (non-standard PDF), fall
#      back to the first MAX_FALLBACK_CHARS characters of the normalised text.
#
# Usage:
#   text = SdsPdfTextExtractor.extract('/path/to/sds.pdf')
#   # => "ABSCHNITT 1: ...\n\n---\n\nABSCHNITT 2: ...\n\n---\n\n..."
#
class SdsPdfTextExtractor
  # GHS sections extracted and forwarded to the LLM:
  #   1 – Identification (product name; for mixtures, trade name only)
  #   2 – Hazard identification (signal word, H-statements, P-statements,
  #        GHS label elements — P-codes live here, NOT in section 8)
  #   3 – Composition/ingredients (component names + CAS numbers for mixtures)
  #   8 – Exposure controls / PPE (OELs, engineering controls, equipment desc.)
  #   9 – Physical and chemical properties
  RELEVANT_SECTIONS = [1, 2, 3, 8, 9].freeze

  # Character cap for smart-extracted sections (≈ 7 500 tokens at 4 chars/token).
  MAX_SECTION_CHARS = 30_000

  # Fallback cap used when section headers cannot be detected in the document.
  MAX_FALLBACK_CHARS = 50_000

  # Matches GHS section headers across the most common SDS languages.
  # Captured group 1 is the section number (1–16).
  #
  # Supported keywords:
  #   SECTION      – English
  #   ABSCHNITT    – German
  #   RUBRIQUE     – French
  #   SEZIONE      – Italian
  #   SECCIÓN/SECCION – Spanish
  #   AVSNITT      – Swedish / Norwegian
  #   AFSNIT       – Danish
  SECTION_HEADER_RE = /
    (?:^|\n)              # start of text or new line
    \s*                   # optional leading whitespace
    (?:SECTION|ABSCHNITT|RUBRIQUE|SEZIONE|SECCI[ÓO]N|AVSNITT|AFSNIT)
    \s+                   # whitespace separator
    (\d{1,2})             # section number (1–16)
    \b                    # word boundary (avoids matching "10" as "1")
  /ix

  # Fallback regex: numbered headings WITHOUT the "SECTION" keyword.
  # Matches lines like "1 IDENTIFICATION", "1. Identification", "1 - IDENTIFICATION".
  # Used when the primary regex finds fewer than 2 relevant sections (non-GHS-standard layout).
  NUMBERED_HEADER_RE = /
    (?:^|\n)              # start of text or new line
    \s*                   # optional leading whitespace
    (\d{1,2})             # section number (1–16)
    [\s.\-:]+             # separator (space, dot, dash, colon)
    (?!\d)                # not followed by another digit (avoid matching "12 34" as section 12)
    [A-ZÄÖÜ]              # must be followed by an uppercase letter (heading text, not data)
  /x

  class ExtractionError < StandardError; end

  # @param file_path [String] Absolute path to the PDF file on disk.
  # @return [String]          Normalised, section-filtered text for the LLM.
  # @raise [ExtractionError]  If the file is missing, gs fails, or no text is found.
  def self.extract(file_path)
    new(file_path).extract
  end

  def initialize(file_path)
    @file_path = file_path.to_s
  end

  def extract
    raise ExtractionError, "SDS PDF not found: #{@file_path}" unless File.exist?(@file_path)

    raw_text = run_ghostscript
    raise ExtractionError, 'No text could be extracted from the SDS PDF' if raw_text.blank?

    # Normalise first — dramatically reduces token usage for multi-column PDFs
    normalised = normalize_whitespace(raw_text)

    sections_text = extract_relevant_sections(normalised)

    if sections_text.present?
      Rails.logger.info(
        "SdsPdfTextExtractor: extracted #{sections_text.length} chars (smart sections) " \
        "from #{File.basename(@file_path)} " \
        "(raw: #{raw_text.length} chars → normalised: #{normalised.length} chars)",
      )
      sections_text
    else
      Rails.logger.info(
        "SdsPdfTextExtractor: section detection failed, using fallback " \
        "(#{[normalised.length, MAX_FALLBACK_CHARS].min} chars) " \
        "for #{File.basename(@file_path)}",
      )
      normalised.slice(0, MAX_FALLBACK_CHARS)
    end
  end

  private

  # Run gs with the txtwrite device, writing output to stdout.
  # No character limit is applied here; trimming happens afterwards.
  def run_ghostscript
    cmd = %W[
      gs
      -dBATCH
      -dNOPAUSE
      -dSAFER
      -sDEVICE=txtwrite
      -sOutputFile=%stdout
      -q
      --
      #{@file_path}
    ]

    stdout, stderr, status = Open3.capture3(*cmd)

    unless status.success?
      truncated_err = stderr.to_s.strip.slice(0, 300)
      raise ExtractionError,
            "Ghostscript failed (exit #{status.exitstatus}): #{truncated_err}"
    end

    stdout.strip
  rescue Errno::ENOENT
    raise ExtractionError, 'Ghostscript (gs) is not installed or not in PATH'
  end

  # Collapse runs of 2+ spaces on each line to 2 spaces and remove blank lines.
  #
  # Some vendor PDFs (e.g. Sigma-Aldrich multi-column layouts) produce lines
  # with 100–300 spaces between label and value when extracted by Ghostscript's
  # txtwrite device.  Normalising reduces token usage by 55–70% on such PDFs
  # without losing any information.
  #
  # We deliberately keep up to 2 consecutive spaces (rather than collapsing to
  # 1) to preserve the visual separation between label and value columns, which
  # helps the LLM understand the structure.
  def normalize_whitespace(text)
    text.split("\n")
        .map { |line| line.gsub(/ {2,}/, '  ').rstrip }
        .reject { |line| line.strip.empty? }
        .join("\n")
  end

  # Scan +text+ using +regex+ and return a Hash mapping section_number → char_offset.
  # Only the FIRST occurrence of each section number is kept.
  def scan_boundaries(text, regex)
    boundaries = {}
    text.scan(regex) do |match|
      num = match[0].to_i
      next unless (1..16).include?(num)

      pos = Regexp.last_match.begin(0)
      boundaries[num] ||= pos
    end
    boundaries
  end

  # Detect GHS section boundaries in +text+ and return only the content of
  # RELEVANT_SECTIONS (1, 2, 3, 8, 9) joined with separators.
  #
  # Primary strategy: match "SECTION N" / "ABSCHNITT N" / etc. (GHS standard).
  # Fallback strategy: match "N HEADING" or "N. HEADING" for non-standard layouts
  # (some vendors omit the "SECTION" keyword).
  #
  # Returns +nil+ if fewer than 2 relevant sections are detected (signals the
  # caller to use the fallback).
  def extract_relevant_sections(text)
    boundaries = scan_boundaries(text, SECTION_HEADER_RE)

    # If the primary regex finds fewer than 2 relevant sections, try the
    # number-only regex (e.g. "1 IDENTIFICATION", "2. HAZARD IDENTIFICATION")
    if (RELEVANT_SECTIONS & boundaries.keys).size < 2
      fallback = scan_boundaries(text, NUMBERED_HEADER_RE)
      # Only use the fallback if it found MORE relevant sections than primary
      boundaries = fallback if (RELEVANT_SECTIONS & fallback.keys).size > (RELEVANT_SECTIONS & boundaries.keys).size
    end

    found_relevant = RELEVANT_SECTIONS & boundaries.keys
    return nil if found_relevant.size < 2

    sorted_boundaries = boundaries.sort_by { |_num, pos| pos }

    parts = RELEVANT_SECTIONS.filter_map do |section_num|
      next unless boundaries[section_num]

      start_pos = boundaries[section_num]
      next_entry = sorted_boundaries.find { |_num, pos| pos > start_pos }
      end_pos = next_entry ? next_entry[1] : text.length

      content = text[start_pos, end_pos - start_pos].strip
      content.empty? ? nil : content
    end

    return nil if parts.empty?

    result = parts.join("\n\n---\n\n")
    result.slice(0, MAX_SECTION_CHARS)
  end
end
