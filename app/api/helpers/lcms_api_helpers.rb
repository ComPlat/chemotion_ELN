# frozen_string_literal: true

# Grape API helpers used by the `POST /api/v1/attachments/lcms_page`
# endpoint. Picks the closest `##PAGE=` block to a requested retention
# time across sibling mz/ms JCamp attachments, using `Lcms::PageIndexer`
# to avoid re-parsing whole attachments at each request.
# rubocop:disable Metrics/ModuleLength
module LcmsApiHelpers
  extend Grape::API::Helpers

  MZ_FILENAME_REGEX = /\.(jdx|dx|jcamp)\z/i.freeze
  MZ_LABEL_REGEX = /(?:^|[._-])(mz|ms)(?:[._-]|$)/i.freeze
  POLARITY_POSITIVE_REGEX = /(?:^|[._-])(plus|positive|pos)(?:[._-]|$)/i.freeze
  POLARITY_NEGATIVE_REGEX = /(?:^|[._-])(minus|negative|neg)(?:[._-]|$)/i.freeze
  ALLOWED_POLARITIES = %w[positive negative].freeze

  # rubocop:disable Metrics/AbcSize
  def lcms_extract_existing_mz_page(att, requested_retention_time, requested_polarity)
    requested_rt = lcms_to_float(requested_retention_time)
    return nil if requested_rt.nil?

    normalized_polarity = lcms_normalize_polarity(requested_polarity)

    candidates = lcms_indexed_candidates(att)
    return nil if candidates.empty?

    scoped = lcms_scope_by_polarity(candidates, normalized_polarity)
    best = lcms_pick_best_page(scoped, requested_rt)
    return nil unless best

    jcamp = Lcms::PageExtractor.extract(
      best[:candidate][:attachment],
      best[:page],
      prefix_size: best[:candidate][:index][:prefix_size],
    )
    return nil if jcamp.blank?

    {
      attachment: best[:candidate][:attachment],
      page_value: best[:page][:page_value],
      distance: best[:distance],
      polarity: best[:candidate][:polarity],
      jcamp: jcamp,
    }
  rescue StandardError => e
    Rails.logger.error(
      "[lcms_page] extraction failed attachment_id=#{att&.id}: #{e.class}: #{e.message}",
    )
    nil
  end
  # rubocop:enable Metrics/AbcSize

  def lcms_safe_predictions(att)
    raw = att&.get_infer_json_content
    return {} if raw.blank?

    JSON.parse(raw)
  rescue JSON::ParserError
    {}
  end

  private

  def lcms_to_float(value)
    Float(value)
  rescue ArgumentError, TypeError
    nil
  end

  def lcms_normalize_polarity(polarity)
    normalized = polarity.to_s.downcase.presence
    ALLOWED_POLARITIES.include?(normalized) ? normalized : nil
  end

  def lcms_page_distance(page_value, requested_rt)
    return Float::INFINITY unless page_value && requested_rt

    (page_value - requested_rt).abs
  end

  def lcms_sibling_attachments(att)
    scope = Attachment.where(attachable_id: att.attachable_id)
    if att.respond_to?(:attachable_type) && att.attachable_type.present?
      scope = scope.where(attachable_type: att.attachable_type)
    end
    scope.where.not(id: att.id)
  end

  def lcms_mz_attachments(att)
    lcms_sibling_attachments(att).select do |candidate|
      name = candidate.filename.to_s
      name.match?(MZ_FILENAME_REGEX) && name.match?(MZ_LABEL_REGEX)
    end
  end

  def lcms_attachment_polarity(att)
    name = att&.filename.to_s
    return 'positive' if name.match?(POLARITY_POSITIVE_REGEX)
    return 'negative' if name.match?(POLARITY_NEGATIVE_REGEX)

    nil
  end

  def lcms_indexed_candidates(att)
    lcms_mz_attachments(att).filter_map do |candidate|
      index = Lcms::PageIndexer.for(candidate)
      next nil if index[:pages].empty?

      {
        attachment: candidate,
        index: index,
        polarity: index[:polarity] || lcms_attachment_polarity(candidate),
      }
    end
  end

  def lcms_scope_by_polarity(candidates, normalized_polarity)
    return candidates unless normalized_polarity

    matching = candidates.select { |c| c[:polarity] == normalized_polarity }
    matching.presence || candidates
  end

  def lcms_pick_best_page(candidates, requested_rt)
    best = nil
    candidates.each do |candidate|
      candidate[:index][:pages].each do |page|
        distance = lcms_page_distance(page[:page_value], requested_rt)
        score = [distance, candidate[:attachment].id]
        if best.nil? || (score <=> best[:score]).negative?
          best = { candidate: candidate, page: page, distance: distance, score: score }
        end
      end
    end
    best
  end
end
# rubocop:enable Metrics/ModuleLength
