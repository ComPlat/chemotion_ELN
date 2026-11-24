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

  # Strip the extension and a trailing `_<digits>` counter in front of it,
  # e.g. `SVS-1265_2.jpg` -> `SVS-1265`.
  def normalize(str)
    str.chomp(File.extname(str)).sub(/_\d*\z/, '')
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
    collection_ids = Collection.own_collections_for(@current_user).ids
    collection_ids += Collection.shared_with_minimum_permission_level(
      @current_user, CollectionShare.permission_level(:edit_elements)
    ).ids

    Sample.by_name(@search_string)
          .or(Sample.by_external_label(@search_string))
          .or(Sample.by_short_label(@search_string))
          .joins(:collections_samples)
          .where(collections_samples: { collection_id: collection_ids })
          .includes(:reactions)
          .distinct
  end

  def reactions
    Reaction
      .by_name(@search_string)
      .or(Reaction.by_short_label(@search_string))
  end
end
