# frozen_string_literal: true

class SharedMethods
  attr_reader :params, :user

  def initialize(user:, params: {})
    @params = params
    @user = user
    @result = {}
  end

  def order_by_molecule(scope)
    scope.includes(:molecule)
         .joins(:molecule)
         .order(Arel.sql("LENGTH(SUBSTRING(molecules.sum_formular, 'C\\d+'))"))
         .order('molecules.sum_formular')
  end

  def order_and_group_for_sequence_based_macromolecule(scope)
    scope.order('sequence_based_macromolecules.short_name ASC')
         .group('sequence_based_macromolecule_samples.id, sequence_based_macromolecules.short_name,
                sequence_based_macromolecule_samples.sequence_based_macromolecule_id')
  end

  def pages(total_elements, per_page)
    total_elements.fdiv(per_page).ceil
  end

  def serialization_by_elements_and_page(elements, error)
    elements.each do |element|
      if element.first == :element_ids
        serialize_generic_elements(element, error)
      else
        paginated_ids = Kaminari.paginate_array(element.last).page(@params[:page]).per(@params[:per_page])
        @result[element.first.to_s.gsub('_ids', '').pluralize] = {
          elements: serialized_elements(element, paginated_ids),
          ids: element.last,
          page: @params[:page],
          perPage: @params[:per_page],
          pages: pages(element.last.size, @params[:per_page]),
          totalElements: element.last.size,
          error: error,
        }
      end
    end
    @result
  end

  def serialized_elements(element, paginated_ids)
    if element.first == :sample_ids
      serialize_sample(paginated_ids)
    elsif element.first == :cell_line_ids || element.first == :cellline_sample_ids
      serialize_cellline(paginated_ids)
    else
      serialize_by_element(element, paginated_ids)
    end
  end

  def serialize_sample(paginated_ids)
    serialized_sample_array = []
    Sample.includes_for_list_display
          .where(id: paginated_ids)
          .order(Arel.sql("position(','||id::text||',' in ',#{paginated_ids.join(',')},')"))
          .each do |sample|
            detail_levels = ElementDetailLevelCalculator.new(user: @user, element: sample).detail_levels
            serialized_sample = Entities::SampleEntity.represent(
              sample,
              detail_levels: detail_levels,
              displayed_in_list: true,
            ).serializable_hash
            serialized_sample_array.push(serialized_sample)
          end
    serialized_sample_array
  end

  def serialize_generic_elements(element, error)
    klasses = Labimotion::ElementKlass.where(is_active: true, is_generic: true)
    klasses.each do |klass|
      element_ids_for_klass = Labimotion::Element.where(id: element.last, element_klass_id: klass.id).pluck(:id)
      paginated_element_ids = Kaminari.paginate_array(element_ids_for_klass)
                                      .page(@params[:page]).per(@params[:per_page])
      serialized_elements = Labimotion::Element.find(paginated_element_ids).map do |generic_element|
        Labimotion::ElementEntity.represent(generic_element, displayed_in_list: true).serializable_hash
      end

      @result["#{klass.name}s"] = {
        elements: serialized_elements,
        ids: element_ids_for_klass,
        page: @page,
        perPage: @page_size,
        pages: pages(element_ids_for_klass.size, @params[:per_page]),
        totalElements: element_ids_for_klass.size,
        error: error,
      }
    end
  end

  def serialize_cellline(paginated_ids)
    CelllineSample.find(paginated_ids).map do |model|
      Entities::CellLineSampleEntity.represent(model, displayed_in_list: true).serializable_hash
    end
  end

  def serialize_by_element(element, paginated_ids)
    model_name = element.first.to_s.gsub('_ids', '').camelize
    entities = "Entities::#{model_name}Entity".constantize

    model_name.constantize.find(paginated_ids).map do |model|
      entities.represent(model, displayed_in_list: true).serializable_hash
    end
  end
end
