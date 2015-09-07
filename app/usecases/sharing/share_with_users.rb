module Usecases
  module Sharing
    class ShareWithUsers
      def initialize(params)
        @params = params
      end

      def getElementIds(element, elementClass)
        if (element.fetch(:all, false))
          excluded_ids = element.fetch(:excluded_ids, [])
          elementClass.where.not(id: excluded_ids).pluck(:id)
        else
          element.fetch(:included_ids,[])
        end
      end

      def execute!
        user_ids = @params.fetch(:user_ids, [])
        collection_attributes = @params.fetch(:collection_attributes, {})
        
        elements_filter = @params.fetch(:elements_filter, {})
        sample = elements_filter.fetch(:sample, {})

        reaction = elements_filter.fetch(:reaction, {})

        user_ids.each do |user_id|
          collection_attributes[:user_id] = user_id
          new_params = {
            collection_attributes: collection_attributes,
            sample_ids: getElementIds(sample, Sample),
            reaction_ids: getElementIds(reaction, Reaction)
          }
          Usecases::Sharing::ShareWithUser.new(new_params).execute!
        end
      end
    end
  end
end
