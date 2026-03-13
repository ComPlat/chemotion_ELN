# frozen_string_literal: true

class InboxSearchElements
  def self.call(**args)
    new(**args).call
  end

  def initialize(search_string:, current_user:, element:)
    @search_string = normalize(search_string)
    @current_user = current_user
    @element = element
  end

  def call
    records.select { |r| ElementPolicy.new(@current_user, r).update? }
  end

  private

  def normalize(str)
    str.chomp(File.extname(str))
  end

  def normalize_for_exact_name(str)
    str = str.dup
    str.chomp!(' EA')
    str.sub!(/-?[a-zA-Z]$/, '')
    str.sub!(/^[a-zA-Z0-9]+-/, '')
    str
  end

  def records
    case @element
    when :sample   then samples
    when :reaction then reactions
    else
      raise ArgumentError, "Unsupported element: #{@element.inspect}"
    end
  end

  def samples
    collection_ids = Collection.belongs_to_or_shared_by(@current_user.id, @current_user.group_ids).map(&:id)
    exact = Sample.by_exact_name(normalize_for_exact_name(@search_string))
                  .joins(:collections_samples)
                  .where(collections_samples: { collection_id: collection_ids })

    short = Sample.by_short_label(@search_string)
                  .joins(:collections_samples)
                  .where(collections_samples: { collection_id: collection_ids })

    exact.or(short).includes(:reactions).distinct
  end

  def reactions
    Reaction
      .by_name(@search_string)
      .or(Reaction.by_short_label(@search_string))
  end
end
