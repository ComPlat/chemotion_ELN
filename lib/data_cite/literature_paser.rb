# frozen_string_literal: true

module DataCite
  class LiteraturePaser
    def self.parse_bibtex!(bib, id)
      return {} if bib.blank?

      # bib = bib.sub('Hermenau2019Genomics‐Driven', 'Hermenau2019Genomics Driven')
      # bib = bib.sub('Scharf2020N‐Heterocyclization', 'Scharf2020N Heterocyclization')
      bx = BibTeX.parse(bib)
      (bx.length.positive? && bx[0]) || {}
    rescue StandardError => e
      Rails.logger.error ["BibTeX parse error, Literature Id: #{id}", e.message,
                          *e.backtrace].join($INPUT_RECORD_SEPARATOR)
    end

    def self.doi_url(id, url, doi, bib)
      return '' if url.blank? && doi.blank? && bib.blank?

      resp = (url.presence || bib['url']&.to_s)
      resp = "https://doi.org/#{doi}" if url.blank? && doi.present?
      resp
    rescue StandardError => e
      Rails.logger.error ["doi_url id: #{id}, doi: #{doi}", e.message, *e.backtrace].join($INPUT_RECORD_SEPARATOR)
    end

    def self.get_metadata(_bib, doi, id)
      return {} if doi.blank?

      connection = Faraday.new(url: 'https://dx.doi.org') do |f|
        f.response :follow_redirects
        f.headers = { 'Accept' => 'application/x-bibtex' }
      end
      resp = connection.get { |req| req.url(doi) }
      if resp.success?
        bx = BibTeX.parse(resp.body)
        (bx.length.positive? && bx[0]) || {}
      else
        Rails.logger.error ["literature id: #{id}, doi: #{doi}", resp.body.to_s].join($INPUT_RECORD_SEPARATOR)
        {}
      end
    rescue StandardError => e
      Rails.logger.error ["DataCite metadata error id: #{id}, doi: #{doi}", e.message,
                          *e.backtrace].join($INPUT_RECORD_SEPARATOR)
    end

    def self.excel_string(lit, bib)
      url = LiteraturePaser.doi_url(lit[:id], lit[:url], lit[:doi], bib)
      "#{bib['author']&.to_s}. (#{bib['year']&.to_s}). #{lit[:title]}. #{lit[:doi]}. #{url}"
    rescue StandardError => e
      "#{bib['author']&.to_s&.dup&.force_encoding('UTF-8')}. (#{bib['year']&.to_s}). #{lit[:title]}. #{lit[:doi]}. #{url}"
    end

    def self.report_hash(lit, bib)
      url = LiteraturePaser.doi_url(lit[:id], lit[:url], lit[:doi], bib)
      { title: lit[:title], url: url, doi: lit[:doi], year: bib['year']&.to_s, issn: bib['issn']&.to_s,
        author: bib['author']&.to_s }
    rescue StandardError => e
      { title: lit[:title], url: url, doi: lit[:doi], year: bib['year']&.to_s, issn: bib['issn']&.to_s,
        author: bib['author']&.to_s&.dup&.force_encoding('UTF-8') }
    end
  end
end
