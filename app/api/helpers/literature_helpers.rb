module LiteratureHelpers
  extend Grape::API::Helpers

  def update_literature(element, literature_list)
    current_literature_ids = element.literature_ids
    literatures = Array(literature_list)
    literatures.each do |lit|

      if lit.is_new
        l = Literature.find_or_create_by(title: lit.title, url: lit.url, doi: lit.doi, isbn: lit.isbn)
        element.literals.where(literature_id: l.id).first || element.literals.build(literature_id: l.id, user_id: current_user.id) if l
      else

        #todo:
        #update
      end
    end
    # included_literature_ids = literatures.map(&:id)
    # deleted_literature_ids = current_literature_ids - included_literature_ids
    # Literature.where(reaction_id: reaction.id, id: deleted_literature_ids).destroy_all
  end

  def update_literatures_for_reaction(reaction, literatures)
    update_literature(reaction, literatures)
  end

  def citation_for_elements(id, type, cat = 'detail')
    return Literature.none unless id.present?
    Literature.by_element_attributes_and_cat(id, type, cat).add_user_info
  end

end #module
