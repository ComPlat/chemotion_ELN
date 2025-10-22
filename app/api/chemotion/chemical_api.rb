# frozen_string_literal: true

module Chemotion
  class ChemicalAPI < Grape::API
    include Grape::Kaminari
    resource :chemicals do
      desc 'update chemicals'
      params do
        requires :chemical_data, type: Array[Hash], desc: 'chemical data'
        optional :cas, type: String, desc: 'cas number'
      end
      route_param :sample_id do
        put do
          Chemotion::ChemicalsService.handle_exceptions do
            attributes = declared(params, include_missing: false)
            if params[:chemical_data].present? || params[:cas].present?
              Chemical.find_by(sample_id: params[:sample_id]).update!(**attributes)
            else
              status 204
            end
          end
        end
      end

      desc 'Return chemical by sample_id'
      params do
        requires :sample_id, type: Integer, desc: 'sample id'
      end

      get do
        Chemotion::ChemicalsService.handle_exceptions do
          Chemical.find_by(sample_id: params[:sample_id]) || Chemical.new
        end
      end

      resource :create do
        desc 'Create a Chemical Entry'
        params do
          requires :chemical_data, type: Array[Hash], desc: 'chemical data'
          requires :cas, type: String
          requires :sample_id, type: Integer
        end

        post do
          Chemotion::ChemicalsService.handle_exceptions do
            attributes = declared(params, include_missing: false)
            Chemical.create!(**attributes)
          end
        end
      end

      resource :fetch_safetysheet do
        desc 'fetch safety data sheet'
        route_param :id do
          params do
            requires :data, type: Hash, desc: 'params'
          end
          get do
            Chemotion::ChemicalsService.handle_exceptions do
              data = params[:data]
              molecule = Molecule.find(params[:id]) if params[:id] != 'null'
              vendor = data[:vendor]
              language = data[:language]
              case data[:option]
              when 'Common Name'
                name = data[:searchStr] || molecule.names[0]
              when 'CAS'
                name = data[:searchStr] || molecule.cas[0]
              end
              case vendor
              when 'Merck'
                { merck_link: Chemotion::ChemicalsService.merck(name, language) }
              when 'Thermofisher'
                { alfa_link: Chemotion::ChemicalsService.alfa(name, language) }
              else
                {
                  alfa_link: Chemotion::ChemicalsService.alfa(name, language),
                  merck_link: Chemotion::ChemicalsService.merck(name, language),
                }
              end
            end
          end
        end
      end

      resource :save_safety_datasheet do
        desc 'save safety data sheet'

        params do
          requires :sample_id, type: Integer, desc: 'sample id'
          requires :cas, type: String
          requires :chemical_data, type: Array[Hash]
          optional :vendor_product, type: String
        end
        post do
          Chemotion::ChemicalsService.handle_exceptions do
            product_info = params[:chemical_data][0][params[:vendor_product]]
            file_path = Chemotion::ChemicalsService.find_existing_or_create_safety_sheet(
              product_info['sdsLink'],
              product_info['vendor'].downcase,
              product_info['productNumber'],
            )
            return error!({ error: file_path[:error] }, 400) if file_path.is_a?(Hash) && file_path[:error]

            Chemotion::ChemicalsService.find_or_create_chemical_with_safety_data(
              sample_id: params[:sample_id],
              cas: params[:cas],
              chemical_data: params[:chemical_data],
              file_path: file_path,
              product_number: product_info['productNumber'],
              vendor: product_info['vendor'].downcase,
            )
          end
        end
      end

      resource :save_manual_sds do
        desc 'save attached safety data sheet'
        params do
          requires :sample_id, type: Integer, desc: 'Sample ID'
          optional :cas, type: String, desc: 'CAS number'
          requires :vendor_info, type: String, desc: 'Vendor info as JSON string'
          requires :vendor_name, type: String, desc: 'Vendor name'
          requires :attached_file, type: File, desc: 'Attached file (SDS document)'
          requires :vendor_product, type: String, desc: 'Vendor product info key'
          optional :chemical_data, type: String, desc: 'Chemical data as JSON string'
        end

        post do
          result = Chemotion::ManualSdsService.create_manual_sds(
            sample_id: params[:sample_id],
            cas: params[:cas],
            vendor_info: params[:vendor_info],
            vendor_name: params[:vendor_name],
            vendor_product: params[:vendor_product],
            attached_file: params[:attached_file],
            chemical_data: params[:chemical_data],
          )

          if result.is_a?(Hash) && result[:error].present?
            error!({ error: result[:error] }, 400)
          else
            # Return the created/updated chemical
            present result
          end
        rescue StandardError => e
          Rails.logger.error("Error in save_manual_sds: #{e.message}")
          error!({ error: "Internal server error: #{e.message}" }, 500)
        end
      end

      resources :safety_phrases do
        desc 'H and P safety phrases'

        params do
          requires :vendor, type: String, desc: 'params'
        end

        route_param :sample_id do
          get do
            Chemotion::ChemicalsService.handle_exceptions do
              chemical = Chemical.find_by(sample_id: params[:sample_id]) || Chemical.new
              if chemical.chemical_data.present?
                if params[:vendor] == 'thermofischer' && chemical.chemical_data[0]['alfaProductInfo']
                  product_number = chemical.chemical_data[0]['alfaProductInfo']['productNumber']
                  Chemotion::ChemicalsService.safety_phrases_thermofischer(product_number)
                elsif params[:vendor] == 'merck' && chemical.chemical_data[0]['merckProductInfo']
                  product_link = chemical.chemical_data[0]['merckProductInfo']['productLink']
                  Chemotion::ChemicalsService.safety_phrases_merck(product_link)
                else
                  err_body = 'No safety phrases could be found'
                  err_body
                end
              else
                status 204
              end
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
          Chemotion::ChemicalsService.handle_exceptions do
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
end
