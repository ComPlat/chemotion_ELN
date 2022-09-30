module Chemotion
  class InventoryAPI < Grape::API
    include Grape::Kaminari
    resource :inventories do
      desc 'update inventory'
      params do
        requires :inventory_parameters, type: Array[Hash], desc: 'inventory parameters'
      end
      route_param :inventoriable_id do
        put do
          attributes = {
            inventory_parameters: params[:inventory_parameters]
            # inventoriable_id: params[:inventoriable_id],
            # inventoriable_type: params[:inventoriable_type]
          }
          if params[:inventory_parameters].present?
            inventory = Inventory.find_by(inventoriable_id: params[:inventoriable_id]).update!(attributes)
            # present inventory, with: Entities::InventoryEntity
            # Entities::InventoryEntity.represent(inventory, serializable: true)
          else
            status 204
          end
        end
      end

      desc 'Return inventory by inventoriable_id and inventoriable_type'
      params do
        requires :inventoriable_id, type: Integer, desc: 'inventoriable id'
        requires :inventoriable_type, type: String, values: %w[Sample]
      end

      get do
        inventory = Inventory.find_by(
          inventoriable_id: params[:inventoriable_id], inventoriable_type: params[:inventoriable_type]
        ) || Inventory.new
        # binding.break
        # present inventory, with: Entities::InventoryEntity, root: 'inventory'
        # Inventory.inventory_parameters
        # Entities::InventoryEntity.represent(inventory, serializable: true)
      end

      resource :create do
        desc 'Create an Inventory'
        params do
          requires :inventory_parameters, type: Array[Hash]
          requires :inventoriable_id, type: Integer
          requires :inventoriable_type, type: String, values: %w[Sample]
        end

        post do
          attributes = {
            inventory_parameters: params[:inventory_parameters],
            inventoriable_id: params[:inventoriable_id],
            inventoriable_type: params[:inventoriable_type]
          }
          inventory = Inventory.new(attributes)
          inventory.save!
          # present inventory, with: Entities::InventoryEntity
          # Entities::InventoryEntity.represent(inventory, serializable: true)
        end
      end

      resource :fetch_safetysheet do
        desc 'fetch safety data sheet'

        route_param :id do
          params do
            requires :data, type: Hash, desc: 'params'
          end
          get do
            data = params[:data]
            molecule = Molecule.find(params[:id])
            vendor = data[:vendor]
            language = data[:language]

            if data[:option] == 'Common Name'
              name = molecule.names[0]
            elsif data[:option] == 'CAS'
              name = molecule.cas[0]
            end

            if vendor == 'Merck'
              { merck_link: Chemotion::InventoryService.merck(name, language) }
            elsif vendor == 'Thermofischer'
              { alfa_link: Chemotion::InventoryService.alfa(name, language) }
            else
              {
                alfa_link: Chemotion::InventoryService.alfa(name, language),
                merck_link: Chemotion::InventoryService.merck(name, language)
              }
            end
          end
        end
      end

      resource :save_safety_datasheet do
        desc 'save safety data sheet'

        params do
          requires :inventoriable_id, type: Integer, desc: 'inventory id'
          requires :inventory_parameters, type: Array[Hash]
          requires :vendor_product, type: String
        end
        post do
          inventory = Inventory.find_by(inventoriable_id: params[:inventoriable_id])
          product_info = params[:inventory_parameters][0][params[:vendor_product]]
          if inventory.present?
            attributes = {
              inventory_parameters: params[:inventory_parameters]
            }
            inventory.update!(attributes)
          else
            attributes = {
              inventory_parameters: params[:inventory_parameters],
              inventoriable_id: params[:inventoriable_id],
              inventoriable_type: 'Sample'
            }
            inventory = Inventory.new(attributes)
            inventory.save!
          end
          Chemotion::InventoryService.create_sds_file(product_info['vendor'], product_info['sdsLink'], product_info['productNumber'])
        end
      end

      resources :safety_phrases do
        desc 'H and P safety phrases'

        params do
          requires :vendor, type: String, desc: 'params'
        end

        route_param :inventoriable_id do
          get do
            inventory = Inventory.find_by(inventoriable_id: params[:inventoriable_id]) || Inventory.new
            if inventory.inventory_parameters.present?
              if params[:vendor] == 'thermofischer' && inventory.inventory_parameters[0]['alfaProductInfo']
                product_number = inventory.inventory_parameters[0]['alfaProductInfo']['productNumber']
                Chemotion::InventoryService.safety_phrases_thermofischer(product_number)
              elsif params[:vendor] == 'merck' && inventory.inventory_parameters[0]['merckProductInfo']
                product_link = inventory.inventory_parameters[0]['merckProductInfo']['productLink']
                Chemotion::InventoryService.safety_phrases_merck(product_link)
              else
                err_body = 'Please fetch and save corresponding safety data sheet first'
                err_body
              end
            else
              status 204
            end
          end
        end
      end

      resources :chemical_properties do
        desc 'additional chemical properties'

        params do
          requires :link, type: String, desc: 'vendor product link'
        end

        get do
          if params[:link].include? 'alfa'
            Chemotion::InventoryService.chemical_properties_alfa(params[:link])
          elsif params[:link].include? 'sigmaaldrich'
            Chemotion::InventoryService.chemical_properties_merck(params[:link])
          end
        end
      end
    end
  end
end