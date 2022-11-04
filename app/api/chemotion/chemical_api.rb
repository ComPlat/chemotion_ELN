# frozen_string_literal: true

module Chemotion
  class ChemicalAPI < Grape::API
    include Grape::Kaminari
    resource :chemicals do
      desc 'update chemicals'
      params do
        requires :chemical_data, type: Array[Hash], desc: 'chemical data'
        requires :cas, type: String, desc: 'cas number'
      end
      route_param :sample_id do
        put do
          attributes = {
            chemical_data: params[:chemical_data],
            cas: params[:cas],
          }
          if params[:chemical_data].present? || params[:cas].present?
            Chemical.find_by(sample_id: params[:sample_id]).update!(attributes)
            # present chemical, with: Entities::ChemicalEntity
            # Entities::ChemicalEntity.represent(chemical, serializable: true)
          else
            status 204
          end
        end
      end

      desc 'Return chemical by sample_id'
      params do
        requires :sample_id, type: Integer, desc: 'sample id'
      end

      get do
        Chemical.find_by(sample_id: params[:sample_id]) || Chemical.new
        # present chemical, with: Entities::ChemicalEntity, root: 'chemical'
        # Entities::ChemicalEntity.represent(chemical, serializable: true)
      end

      resource :create do
        desc 'Create a Chemical Entry'
        params do
          requires :chemical_data, type: Array[Hash]
          requires :cas, type: String
          requires :sample_id, type: Integer
        end

        post do
          attributes = {
            chemical_data: params[:chemical_data],
            cas: params[:cas],
            sample_id: params[:sample_id],
          }
          chemical = Chemical.new(attributes)
          chemical.save!
          # present chemical, with: Entities::ChemicalEntity
          # Entities::ChemicalEntity.represent(chemical, serializable: true)
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
            case data[:option]
            when 'Common Name'
              name = molecule.names[0]
            when 'CAS'
              name = molecule.cas[0]
            end
            case vendor
            when 'Merck'
              { merck_link: Chemotion::ChemicalsService.merck(name, language) }
            when 'Thermofischer'
              { alfa_link: Chemotion::ChemicalsService.alfa(name, language) }
            else
              { alfa_link: Chemotion::ChemicalsService.alfa(name, language),
                merck_link: Chemotion::ChemicalsService.merck(name, language) }
            end
          end
        end
      end

      resource :save_safety_datasheet do
        desc 'save safety data sheet'

        params do
          requires :sample_id, type: Integer, desc: 'sample id'
          requires :chemical_data, type: Array[Hash]
          requires :vendor_product, type: String
        end
        post do
          chemical = Chemical.find_by(sample_id: params[:sample_id])
          product_info = params[:chemical_data][0][params[:vendor_product]]
          if chemical.present?
            attributes = {
              chemical_data: params[:chemical_data],
            }
            chemical.update!(attributes)
          else
            attributes = {
              chemical_data: params[:chemical_data],
              sample_id: params[:sample_id],
            }
            chemical = Chemical.new(attributes)
            chemical.save!
          end
          file_path = "#{product_info['productNumber']}_#{product_info['vendor']}.pdf"
          Chemotion::ChemicalsService.create_sds_file(file_path, product_info['sdsLink'])
        end
      end

      resources :safety_phrases do
        desc 'H and P safety phrases'

        params do
          requires :vendor, type: String, desc: 'params'
        end

        route_param :sample_id do
          get do
            chemical = Chemical.find_by(sample_id: params[:sample_id]) || Chemical.new
            if chemical.chemical_data.present?
              if params[:vendor] == 'thermofischer' && chemical.chemical_data[0]['alfaProductInfo']
                product_number = chemical.chemical_data[0]['alfaProductInfo']['productNumber']
                Chemotion::ChemicalsService.safety_phrases_thermofischer(product_number)
              elsif params[:vendor] == 'merck' && chemical.chemical_data[0]['merckProductInfo']
                product_link = chemical.chemical_data[0]['merckProductInfo']['productLink']
                Chemotion::ChemicalsService.safety_phrases_merck(product_link)
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
            Chemotion::ChemicalsService.chemical_properties_alfa(params[:link])
          elsif params[:link].include? 'sigmaaldrich'
            Chemotion::ChemicalsService.chemical_properties_merck(params[:link])
          end
        end
      end
    end
  end
end
