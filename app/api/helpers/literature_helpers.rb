# frozen_string_literal: true

module LiteratureHelpers
  extend Grape::API::Helpers

  def update_literature(element, literature_list)
    element.literature_ids
    literatures = Array(literature_list)
    literatures.each do |lit|
      next unless lit.is_new

      l = Literature.find_or_create_by(title: lit.title, url: lit.url, doi: lit.doi, isbn: lit.isbn)
      if l
        element.literals.where(literature_id: l.id).first || element.literals.build(literature_id: l.id,
                                                                                    user_id: current_user.id)
      end
      # TODO: implement update lit, if lit is not new
    end
    # included_literature_ids = literatures.map(&:id)
    # deleted_literature_ids = current_literature_ids - included_literature_ids
    # Literature.where(reaction_id: reaction.id, id: deleted_literature_ids).destroy_all
  end

  def update_literatures_for_reaction(reaction, literatures)
    update_literature(reaction, literatures)
  end

  def citation_for_elements(element_ids, element_type, cat = 'detail')
    return Literature.none if element_ids.blank?

    Literal
      .joins(:literature)
      .where(
        element_id: Array(element_ids),
        element_type: element_type,
        category: cat,
      )
      .select(
        'literatures.*',
        'literals.id AS literal_id',
        'literals.litype',
        'literals.user_id',
        'literals.element_id',
        'literals.element_type',
        'literals.updated_at AS element_updated_at',
      )
  end

  def create_literatures_and_literals(element, literatures)
    return if literatures.blank? || element.blank?

    literatures.to_h.each_value do |data|
      next unless data.is_a?(Hash)

      refs, doi, url, title, isbn, litype = data.values_at(:refs, :doi, :url, :title, :isbn, :litype)

      lit = Literature.find_or_create_by!(
        doi: doi,
        url: url,
        title: title,
        isbn: isbn,
      )

      lit.update!(refs: (lit.refs || {}).merge(declared(refs))) if refs.present?

      create_literal(lit.id, current_user.id, element.class.name, element.id, litype)
    end
  end

  def create_literal(lit_id, user_id, element_type, element_id, litype)
    literal = Literal.find_or_initialize_by(
      literature_id: lit_id,
      user_id: user_id,
      element_type: element_type,
      element_id: element_id,
      category: 'detail',
    )

    return unless literal.new_record?

    literal.litype = litype
    literal.save!
  end
end
