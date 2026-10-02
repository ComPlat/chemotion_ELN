# frozen_string_literal: true

module Chemotion
  # Recovers H and P codes from statement wording, for sheets that print the sentences
  # without their codes. A span maps to a code only when its wording is close to one
  # catalogue entry, agrees with it on every decisive word, and no other code ties it.
  class SdsPhraseMatcher
    MIN_SCORE = 0.85
    MIN_MATCHED_WORDS = 2
    # A placeholder such as the "…" in "Use … to extinguish" stands for at most this many words.
    WILDCARD_SPAN = 8
    MAX_FRAGMENTS_PER_STATEMENT = 4
    WILDCARD = :wildcard
    STOPWORDS = %w[a an the and or].freeze
    # Severity, route and negation: a near match that differs in one of these is a different hazard.
    DECISIVE = %w[may suspected fatal toxic harmful very extremely highly serious severe not no
                  immediately skin eye respiratory swallowed inhaled].freeze
    SPELLING = {
      'vapour' => 'vapor', 'vapours' => 'vapors', 'centre' => 'center', 'colour' => 'color',
      'odour' => 'odor', 'sensitisation' => 'sensitization', 'aluminium' => 'aluminum',
      'sulphur' => 'sulfur', 'neutralise' => 'neutralize', 'organisation' => 'organization'
    }.freeze
    DELETED = /\A\s*\[Deleted/i.freeze
    EDITORIAL = /\[(?:As\s+modified|Added|Deleted)\s+by[^\]]*\]/i.freeze
    # Square brackets in the catalogue hold optional conditions; ellipses hold fill-ins.
    PLACEHOLDER = /…|\.{3}|\[[^\]]*\]/.freeze
    SENTENCE_END = /(?<=[.;])\s+/.freeze
    SUBHEADING = /\A(?:signal\s+word|danger|warning|hazard\s+statements?|precautionary\s+statements?|
                    prevention|response|storage|disposal|skin|eyes?|inhalation|ingestion|fire|
                    spills?|general|label\s+elements?)\s*:?\z/ix.freeze
    # Rules, page numbers and running headers that a page break drops between statements.
    PAGE_FURNITURE = %r{\A(?:_{5,}|Page\s+\d+\s*(?:/|of)\s*\d+|.*\bRevision\s+Date\b.*)\z}i.freeze
    # The label of a "label : statement" row, as Sigma prints the first statement of each block.
    LEADING_LABEL = /\A(?:hazard\s+statements?|precautionary(?:\s+statements?)?|prevention|response|storage|
                     disposal|supplemental\s+hazard(?:\s+statements?)?)\s*:\s*/ix.freeze
    MAX_UNMATCHED_REPORTED = 20
    VARIANTS_FILE = File.expand_path('sds_phrase_variants.yml', __dir__)
    PHRASE_FILES = %w[json/hazardPhrases.json json/precautionaryPhrases.json].freeze

    Entry = Struct.new(:code, :words, :wildcards, keyword_init: true)
    Hit = Struct.new(:code, :score, :value, :text, keyword_init: true)

    def self.match(lines)
      new(catalog).match(lines)
    end

    def self.catalog
      @catalog ||= build_catalog.freeze
    end

    # Identical wording under several keys keeps the most combined code: the table files
    # P305 under the text of P305+P351+P338. A combination with a deleted part is obsolete.
    def self.build_catalog
      by_wording = {}
      live_wordings.each do |code, text|
        tokens = tokenize(text, catalogue: true)
        held = by_wording[tokens]
        by_wording[tokens] = code if held.nil? || code.count('+') > held.count('+')
      end
      by_wording.map do |tokens, code|
        Entry.new(code: code, words: tokens - [WILDCARD], wildcards: tokens.count(WILDCARD)).freeze
      end
    end

    def self.live_wordings
      all = wordings
      deleted = all.select { |_, text| text.to_s.match?(DELETED) }.map(&:first)
      all.reject { |code, _| (code.split('+') & deleted).any? }
    end

    def self.wordings
      phrases = PHRASE_FILES.flat_map { |file| JSON.parse(Rails.public_path.join(file).read).to_a }
      variants = YAML.safe_load(File.read(VARIANTS_FILE)).flat_map do |code, texts|
        Array(texts).map { |text| [code, text] }
      end
      known = phrases.to_h
      phrases + variants.select { |code, _| known.key?(code) }
    end

    def self.tokenize(text, catalogue: false)
      text = text.to_s.gsub(EDITORIAL, ' ')
      text = text.gsub(PLACEHOLDER, ' xwildcardx ') if catalogue
      words = text.downcase.split(/[^a-z0-9]+/) - ['', *STOPWORDS]
      tokens = words.map { |word| word == 'xwildcardx' ? WILDCARD : normalize(word) }
      tokens.chunk_while { |a, b| a == WILDCARD && b == WILDCARD }.map(&:first)
    end

    def self.normalize(word)
      stem(SPELLING.fetch(word, word))
    end

    def self.stem(word)
      return word if word.length <= 3 || !word.end_with?('s') || word.end_with?('ss', 'us', 'is')

      word[0..-2]
    end

    def initialize(catalog)
      @catalog = catalog
    end

    # => { codes: [...], matched: [{ text, code, score }], unmatched: [text, ...], ambiguous: [...] }
    def match(lines)
      @ambiguous = {}
      fragments = fragment(lines)
      hits, covered = segment(fragments)
      {
        codes: hits.map(&:code).uniq,
        matched: hits.map { |hit| { 'text' => hit.text, 'code' => hit.code, 'score' => hit.score.round(2) } },
        unmatched: unmatched(fragments, covered),
        ambiguous: @ambiguous.reject { |range, _| range.any? { |index| covered.include?(index) } }.values.uniq,
      }
    end

    private

    def fragment(lines)
      Array(lines).flat_map { |line| line.to_s.strip.split(SENTENCE_END) }
                  .map { |text| text.strip.sub(LEADING_LABEL, '') }
                  .reject { |text| text.empty? || text.match?(SUBHEADING) || text.match?(PAGE_FURNITURE) }
    end

    # Best cover of the fragments by statements, where a statement may span a wrapped line
    # or several sentences of one combined code.
    def segment(fragments)
      best = Array.new(fragments.length + 1)
      best[0] = [0, []]
      fragments.each_index { |first| extend_from(best, fragments, first) }
      picks = best.last[1]
      [picks.map(&:first), picks.flat_map { |_, span| span.to_a }]
    end

    def extend_from(best, fragments, first)
      value, picks = best[first]
      relax(best, first + 1, best[first])
      (first...[first + MAX_FRAGMENTS_PER_STATEMENT, fragments.length].min).each do |last|
        span = first..last
        hit = best_hit(fragments[span].join(' '), span)
        relax(best, last + 1, [value + hit.value, picks + [[hit, span]]]) if hit
      end
    end

    def relax(best, index, candidate)
      best[index] = candidate if best[index].nil? || candidate[0] > best[index][0]
    end

    def best_hit(text, range)
      tokens = self.class.tokenize(text)
      return nil if tokens.length < MIN_MATCHED_WORDS

      # Coverage first: a trailing placeholder must not let a shorter entry swallow a longer one's words.
      top, runner_up = @catalog.filter_map { |entry| score(entry, tokens, text) }
                               .sort_by { |hit| [-hit.value, -hit.score] }
      return top unless tied?(top, runner_up)

      @ambiguous[range] = text
      nil
    end

    def tied?(top, runner_up)
      !runner_up.nil? && runner_up.code != top.code && [runner_up.value, runner_up.score] == [top.value, top.score]
    end

    # Dice overlap of the words, where the words a placeholder takes count on neither side.
    def score(entry, tokens, text)
      return nil unless decisive_words_agree?(entry, tokens)

      matched = shared_word_count(entry.words, tokens)
      return nil if matched < MIN_MATCHED_WORDS

      unexplained = tokens.length - matched - [tokens.length - matched, entry.wildcards * WILDCARD_SPAN].min
      score = 2.0 * matched / (entry.words.length + matched + unexplained)
      return nil if score < MIN_SCORE

      Hit.new(code: entry.code, score: score, value: matched - unexplained, text: text)
    end

    def shared_word_count(words, tokens)
      pool = tokens.tally
      words.count { |word| pool[word].to_i.positive? && (pool[word] -= 1) }
    end

    # Text may carry extra decisive words only where the entry has a placeholder to hold them.
    def decisive_words_agree?(entry, tokens)
      decisive_in_entry = entry.words & DECISIVE
      return false unless (decisive_in_entry - tokens).empty?

      entry.wildcards.positive? || ((tokens & DECISIVE) - decisive_in_entry).empty?
    end

    def unmatched(fragments, covered)
      fragments.each_index.reject { |index| covered.include?(index) }
               .map { |index| fragments[index] }.first(MAX_UNMATCHED_REPORTED)
    end
  end
end
