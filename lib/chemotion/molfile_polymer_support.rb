# frozen_string_literal: true

module Chemotion
  # Shared helpers for molfiles that contain PolymersList and/or TextNode blocks.
  # Used by SvgRenderer, Import::ImportSamples, Import::ImportSdf, Import::ImportCollections, Export::ExportSdf.
  module MolfilePolymerSupport
    POLYMERS_LIST_TAG = '> <PolymersList>'
    TEXT_NODE_TAG = '> <TextNode>'
    TEXT_NODE_CLOSE_TAG = '> </TextNode>'
    M_END_MARKER = 'M  END'
    # An SDF data block ends at the next data header ("> <Tag>"), at the record separator, or --
    # for the malformed-but-real legacy layout described in .data_block_body -- at "M  END".
    SDF_DATA_HEADER_PREFIX = '> <'
    SDF_RECORD_SEPARATOR = '$$$$'

    module_function

    # rubocop:disable Naming/PredicatePrefix
    def has_polymers_list_tag?(molfile)
      return false if molfile.nil?

      # Scrub before the substring check: molfile.blank? (used prior to this guard) is a regex
      # match under the hood and raises ArgumentError on non-UTF-8 bytes -- see #to_utf8.
      to_utf8(molfile).include?(POLYMERS_LIST_TAG)
    end

    def has_text_node_tag?(molfile)
      return false if molfile.nil?

      to_utf8(molfile).include?(TEXT_NODE_TAG)
    end

    # True when the molfile carries a block that must survive CTAB trimming.
    #
    # The PolymersList half tests for *payload*, not the tag: Ketcher writes an empty
    # "> <PolymersList>" block for ordinary structures, and preserving that on export would
    # re-emit the empty tag into the SDF and carry it to whatever instance imports it. The
    # TextNode half stays on tag presence -- TextNode blocks are written with an explicit
    # "> </TextNode>" close and have no known empty-block emitter.
    #
    # @param molfile [String, nil]
    # @return [Boolean]
    def has_polymer_or_textnode_blocks?(molfile)
      has_polymer_content?(molfile) || has_text_node_tag?(molfile)
    end

    # True only when a PolymersList block carries a payload. Ketcher writes an empty
    # "> <PolymersList>" block for structures that have no polymer at all; those must take the
    # ordinary molecule path, not the polymer one (which would give them a synthetic
    # POLYMER_<sha> inchikey and an Indigo-rendered SVG).
    #
    # @param molfile [String, nil]
    # @return [Boolean]
    def has_polymer_content?(molfile)
      polymers_list_payload(molfile).present?
    end
    # rubocop:enable Naming/PredicatePrefix

    # Body of the molfile's "> <PolymersList>" block(s), flattened to a single space-joined line.
    #
    # Every block is scanned, because a molfile can carry a redundant indices-only block
    # ("0 1 2") followed by the full-format one ("0/95/1.00-1.00"); the full-format block wins so
    # callers get the template ids. A block ends at the next SDF data header or at +$$$$+ — not at
    # end-of-string — so a following "> <TextNode>" block is never mistaken for polymer payload.
    #
    # @param molfile [String, nil]
    # @return [String] the payload, or +''+ when there is no block or every block is empty
    def polymers_list_payload(molfile)
      blocks = polymers_list_blocks(molfile)
      return '' if blocks.empty?

      blocks.find { |content| content.include?('/') } || blocks.first
    end

    # @param molfile [String, nil]
    # @return [Array<String>] one space-joined payload per non-empty "> <PolymersList>" block
    def polymers_list_blocks(molfile)
      return [] if molfile.nil?

      # No String#blank? on the raw argument: ActiveSupport's implementation is a regex match and
      # raises ArgumentError on a molfile carrying non-UTF-8 bytes. #to_utf8 scrubs first.
      lines = to_utf8(molfile).lines
      lines.each_index.with_object([]) do |index, blocks|
        next unless lines[index].strip == POLYMERS_LIST_TAG

        content = data_block_body(lines, index)
        blocks << content unless content.empty?
      end
    end

    # Collects the payload lines that follow the data header at +header_index+.
    #
    # Terminates on "M  END" as well as on the next data header / "$$$$". A well-formed SDF never
    # needs that: data blocks follow the CTAB, so "M  END" is already behind us. But ketcher-rails
    # (2016-2024) wrote "> <PolymersList>" *inside* the CTAB, ahead of "M  END", and ~130 such
    # samples are still stored. Without this guard the marker is swallowed into the payload
    # ("0" becomes "0 M  END"), and -- worse -- an *empty* legacy block yields the payload
    # "M  END", which is +present?+ and so makes .has_polymer_content? report a polymer for an
    # ordinary molecule: exactly the false positive this module exists to prevent.
    #
    # @param lines [Array<String>] all molfile lines
    # @param header_index [Integer] index of the "> <Tag>" line
    # @return [String] space-joined, blank-stripped payload (+''+ when the block is empty)
    def data_block_body(lines, header_index)
      body = []
      lines[(header_index + 1)..].to_a.each do |raw|
        line = raw.strip
        break if data_block_terminator?(line)

        body << line unless line.empty?
      end
      body.join(' ')
    end

    # @param line [String] an already-stripped molfile line
    # @return [Boolean] whether the line ends the data block that precedes it
    def data_block_terminator?(line)
      line.start_with?(SDF_DATA_HEADER_PREFIX) ||
        line == SDF_RECORD_SEPARATOR ||
        # Loose match, matching #keep_only_ctab: writers vary the inner spacing of "M  END".
        line.match?(/\AM\s+END\z/i)
    end

    # Appends the trailing newline Open Babel needs. Deliberately does NOT touch the front of the
    # molfile: MOL is positional, line 1 is the title and may legitimately be empty, so callers
    # must preserve a leading newline rather than have it re-added here. Prepending
    # unconditionally shifts a *titled* molfile ("benzene\\n  Mrv…") down one line and Open Babel
    # then returns a blank inchikey — see +ImportSamples#get_data_from_molfile+, which +rstrip+s
    # (not +strip+s) its input for exactly this reason.
    #
    # @param molfile [String, nil]
    # @return [String] the padded molfile, never nil
    def normalize_for_open_babel(molfile)
      # Scrub before the blank? check: ActiveSupport's #blank? is a regex match and raises
      # ArgumentError on non-UTF-8 bytes (see #to_utf8) -- this method's own callers are not all
      # guaranteed to have scrubbed already.
      molfile = to_utf8(molfile)
      return "\n" if molfile.blank?

      molfile.end_with?("\n") ? molfile : "#{molfile}\n"
    end

    # Strip PolymersList and TextNode blocks, then keep only CTAB (up to and including M  END).
    # Use for Open Babel / inchikey so it does not see custom blocks.
    def clean_molfile_for_inchikey(raw_molfile)
      return nil if raw_molfile.nil?

      # Scrub before the blank? check: ActiveSupport's #blank? raises ArgumentError on non-UTF-8
      # bytes (see #to_utf8) -- checking on the raw argument would reintroduce that crash here.
      s = to_utf8(raw_molfile)
      return nil if s.blank?

      # NB: the `<\s` in the lookahead is deliberate — it does not match a following `> <Tag>`
      # header, so each block is deleted through to end-of-string. That is what this method wants
      # (only the CTAB survives #keep_only_ctab anyway), unlike .polymers_list_payload, which has
      # to stop at the next header.
      s = s.gsub(/>\s*<\s*PolymersList\s*>[\s\S]*?(?=\n\s*>\s*<\s|\z)/i, '')
      s = s.gsub(/>\s*<\s*TextNode\s*>[\s\S]*?(?=\n\s*>\s*<\s|\z)/i, '')
      keep_only_ctab(s)
    end

    # Keep only the CTAB (up to and including first M  END). Safe for Open Babel.
    def keep_only_ctab(molfile)
      return molfile if molfile.nil?

      # Scrub before the blank? check: ActiveSupport's #blank? raises ArgumentError on non-UTF-8
      # bytes (see #to_utf8) -- this is on the hot path for every plain (non-polymer) import row.
      molfile = to_utf8(molfile)
      return molfile if molfile.blank?

      lines = molfile.lines
      m_end_index = lines.index { |line| line.match?(/\s*M\s+END\s*/i) }
      if m_end_index
        lines[0..m_end_index].join.rstrip
      elsif (idx = molfile.index(/\sM\s+END\s/i))
        end_marker = molfile[/\sM\s+END\s/i]
        molfile[0..(idx + end_marker.length - 1)].rstrip
      else
        molfile
      end
    end

    # Import sources (Excel round-trips, mis-detected SDF encodings) hand us bytes that are not
    # valid UTF-8. A bare +force_encoding+ leaves the string invalid and every subsequent regex or
    # +String#match?+ over it raises ArgumentError, taking the whole import down; +scrub+ replaces
    # the offending bytes instead. Always returns a fresh, unfrozen string.
    #
    # @param molfile [#to_s]
    # @return [String] UTF-8, valid-encoding copy
    def to_utf8(molfile)
      molfile.to_s.dup.force_encoding('UTF-8').scrub
    end
  end
end
