module LiteratureHelpers
  extend Grape::API::Helpers

  def update_literature(element, literature_list)
    element.literature_ids
    literatures = Array(literature_list)
    literatures.each do |lit|
      if lit.is_new
        l = Literature.find_or_create_by(title: lit.title, url: lit.url, doi: lit.doi, isbn: lit.isbn)
        if l
          element.literals.where(literature_id: l.id).first || element.literals.build(literature_id: l.id,
                                                                                      user_id: current_user.id)
        end
      else

        # todo:
        # update
      end
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
end # module
