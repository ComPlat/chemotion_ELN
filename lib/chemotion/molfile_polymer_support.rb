# frozen_string_literal: true

module Chemotion
  # Shared helpers for molfiles that contain PolymersList and/or TextNode blocks.
  # Used by SvgRenderer, Import::ImportSamples, Import::ImportSdf, Import::ImportCollections, Export::ExportSdf.
  module MolfilePolymerSupport
    POLYMERS_LIST_TAG = '> <PolymersList>'
    TEXT_NODE_TAG = '> <TextNode>'
    TEXT_NODE_CLOSE_TAG = '> </TextNode>'
    M_END_MARKER = 'M  END'

    module_function

    # rubocop:disable Naming/PredicatePrefix
    def has_polymers_list_tag?(molfile)
      return false if molfile.blank?

      molfile.to_s.include?(POLYMERS_LIST_TAG)
    end

    def has_text_node_tag?(molfile)
      return false if molfile.blank?

      molfile.to_s.include?(TEXT_NODE_TAG)
    end

    def has_polymer_or_textnode_blocks?(molfile)
      has_polymers_list_tag?(molfile) || has_text_node_tag?(molfile)
    end
    # rubocop:enable Naming/PredicatePrefix

    # Strip PolymersList and TextNode blocks, then keep only CTAB (up to and including M  END).
    # Use for Open Babel / inchikey so it does not see custom blocks.
    def clean_molfile_for_inchikey(raw_molfile)
      return nil if raw_molfile.blank?

      s = raw_molfile.to_s.dup.force_encoding('UTF-8')
      s = s.gsub(/>\s*<\s*PolymersList\s*>[\s\S]*?(?=\n\s*>\s*<\s|\z)/i, '')
      s = s.gsub(/>\s*<\s*TextNode\s*>[\s\S]*?(?=\n\s*>\s*<\s|\z)/i, '')
      keep_only_ctab(s)
    end

    # Keep only the CTAB (up to and including first M  END). Safe for Open Babel.
    def keep_only_ctab(molfile)
      return molfile if molfile.blank?

      molfile = molfile.to_s.dup.force_encoding('UTF-8')
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
  end
end
