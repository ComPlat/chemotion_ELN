module Chemotion
  class InventoryAPI < Grape::API
    # include Grape::Kaminari

    resource :inventories do

      desc "update inventory"
      params do
        requires :inventory_parameters, type: Array[Hash], desc: 'inventory parameters'
      end
      route_param :id do
        put do
          attributes = {
            inventory_parameters: params[:inventory_parameters],
            # inventoriable_id: params[:inventoriable_id],
            # inventoriable_type: params[:inventoriable_type]
          }
          if params[:inventory_parameters].present?
            inventory = Inventory.find(params[:id]).update!(attributes)
          else
            status 204
          end
        end
      end

      desc 'Return inventory by noteable_id and noteable_type'
      params do
        requires :inventoriable_id, type: Integer, desc: 'inventoriable id'
        requires :inventoriable_type, type: String, values: %w[Sample Reaction Wellplate Screen ResearchPlan]
      end

      get do
        inventory = Inventory.find_by(
          inventoriable_id: params[:inventoriable_id], inventoriable_type: params[:inventoriable_type]
        ) || Inventory.new
        # binding.break
        # present note, with: Entities::PrivateNoteEntity, root: 'note'
        # Inventory.inventory_parameters
      end

      resource :create do
        desc 'Create an Inventory'
        params do
          requires :inventory_parameters, type: Array[Hash]
          requires :inventoriable_id, type: Integer
          requires :inventoriable_type, type: String, values: %w[Sample Reaction Wellplate Screen ResearchPlan]
        end

        post do
          attributes = {
            inventory_parameters: params[:inventory_parameters],
            inventoriable_id: params[:inventoriable_id],
            inventoriable_type: params[:inventoriable_type]
          }
          inventory = Inventory.new(attributes)
          inventory.save!
        end
      end

      # post do
      #   rsp = EnzymeMl.create_omex_file(@bd)
      #   env['api.format'] = :binary
      #   content_type rsp.headers["content-type"]
      #   header['Content-Disposition'] = rsp.headers["Content-Disposition"]
      #   rsp.body
      # end
      #https://www.strem.com/catalog/index.php?x=0&y=0&keyword=#{CAS}&page_function=keyword_search

      resource :fetchsds do
        desc 'fetch safety data sheet'
        params do
          # requires :inventory_parameters, type: Array[Hash]
        end

        route_param :id do
          post do
            attributes = {
              inventory_parameters: params[:inventory_parameters]
            }
            ssdArr = Array.new
            inventory = Inventory.find(params[:id])
            name = inventory.inventory_parameters[0]['sample_name']
            molecule_id = inventory.inventory_parameters[0]['molecule_id']

            
            options = { :headers => {'Content-Type' => 'application/pdf'} }

            

            # req = HTTParty.get("https://www.alfa.com/en/search/?q=#{name}")
            # product_number = Nokogiri::HTML.parse(req.body).xpath("//*[@class=\"#{"search-result-number"}\"]").at_css("span").children.text
            # req_ssd = HTTParty.get("https://www.alfa.com/en/msds/?language=DE&subformat=CLP1&sku=#{product_number}", options)


            # req_ssd.headers['Content-Type']
            # ssdArr.push req_ssd
            # ssdArr[0]


            req = HTTParty.get("https://www.strem.com/catalog/index.php?x=0&y=0&keyword=1295-35-8&page_function=keyword_search", options)
            req.headers['Content-Type']
            strem_link = Nokogiri::HTML.parse(req.body).xpath("//*[@class=\"#{"printer_link"}\"]").css("a")[1].attributes["href"].value
            req_ssd = HTTParty.get("https://www.strem.com#{strem_link}", options)


            env['api.format'] = :binary
            content_type req_ssd.headers["content-type"]
            header['Content-Disposition'] = req_ssd.headers["Content-Disposition"]





            req_ssd

          end
        end
      end
    end
  end
end  