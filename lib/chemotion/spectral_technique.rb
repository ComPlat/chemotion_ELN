# frozen_string_literal: true

module Chemotion
  # Detects the analytical technique of a single measurement so the
  # spectral_extraction task can inject the matching prompt fragment (schema +
  # worked example) and, for NMR, the correct nucleus.
  #
  # Detection prefers the analysis type (extended_metadata.kind — an OLS/CHMO
  # ontology term such as "13C nuclear magnetic resonance spectroscopy (13C NMR)")
  # and falls back to sniffing the measurement text itself.
  #
  # Returns a Hash: { key:, label:, nucleus: }
  #   key     — matches a technique key in spectral_extraction.yml
  #             (nmr, ms, ir, uvvis, hplc, generic)
  #   label   — display label (e.g. "13C NMR", "Mass Spectrometry", "IR")
  #   nucleus — for NMR only, the detected nucleus (e.g. "1H", "13C", "19F");
  #             nil otherwise
  #
  # Usage:
  #   Chemotion::SpectralTechnique.detect(kind: '1H NMR', text: '1H NMR (400 MHz ...')
  #   # => { key: 'nmr', label: '1H NMR', nucleus: '1H' }
  #
  module SpectralTechnique
    module_function

    # Common isotope/element combinations used as NMR nuclei. Multi-character
    # element symbols are listed first so the alternation prefers them.
    NUCLEUS_RE = /
      \b(\d{1,3})\s*(Si|Sn|Se|Li|Al|Pt|Rh|Na|Xe|Te|Cd|H|C|N|O|F|P|B)\b
    /x.freeze

    def detect(kind: nil, text: nil)
      haystack = "#{kind} #{text}"

      if nmr?(haystack)
        nucleus = nucleus_for(haystack)
        return { key: 'nmr', label: "#{nucleus} NMR", nucleus: nucleus }
      end

      return { key: 'ms',    label: 'Mass Spectrometry', nucleus: nil } if ms?(haystack)
      return { key: 'ir',    label: 'IR',                nucleus: nil } if ir?(haystack)
      return { key: 'uvvis', label: 'UV-Vis',            nucleus: nil } if uvvis?(haystack)
      return { key: 'hplc',  label: 'HPLC/GC',           nucleus: nil } if chromatography?(haystack)

      { key: 'generic', label: 'Spectral', nucleus: nil }
    end

    def nmr?(str)
      str.match?(/\bNMR\b/i) || str.match?(/nuclear magnetic resonance/i)
    end

    def ms?(str)
      str.match?(/\bHRMS\b/i) ||
        str.match?(/\bmass spectrometry\b/i) ||
        str.match?(/\bMALDI\b|\bESI\b|\bAPCI\b|\bEI\b|\bFAB\b/i) ||
        str.match?(%r{\bm/z\b}i) ||
        str.match?(/\bMS\b/)
    end

    def ir?(str)
      str.match?(/\binfrared\b/i) ||
        str.match?(/\bIR\b/) ||
        str.match?(/\bATR\b/i) ||
        str.match?(/\bRaman\b/i)
    end

    def uvvis?(str)
      str.match?(%r{uv[/\-\s]*vis}i) ||
        str.match?(/ultraviolet/i) ||
        str.match?(/(?:λ|lambda)\s*max/i)
    end

    def chromatography?(str)
      str.match?(/\bHPLC\b|\bUPLC\b|\bLC[-\s]?MS\b/i) ||
        str.match?(/\bGC\b/) ||
        str.match?(/chromatograph/i) ||
        str.match?(/retention time/i)
    end

    # Extract the first NMR nucleus from the text; default "1H" when the technique
    # is NMR but no explicit nucleus is present.
    def nucleus_for(str)
      m = str.match(NUCLEUS_RE)
      return '1H' unless m

      "#{m[1]}#{m[2]}"
    end
  end
end
