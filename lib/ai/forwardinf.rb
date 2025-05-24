require 'uri'

module Ai::Forwardinf

  def self.addSvg(obj_arr)
    return unless obj_arr.is_a?(Array)

    obj_arr.each do |mol|
      mol['svg'] = png(mol['prd_smiles'])
    # Recursively process the children nodes
    end
  end

  def self.addSvgData(nodes)
    return unless nodes.is_a?(Array)

    nodes.each do |node|
      node['svg'] = png(node['smiles'])
      node['buyables'] = fetchBuyables(node['smiles'])
      node['is_buyable'] = !node['buyables']['result'].empty?
    # Recursively process the children nodes
      addSvgData(node['children'])
    end
  end

  def self.fetchTask(task_id)
    url = Rails.configuration.inference.url
    options = { verify: false }
    task_url = "https://#{url}/api/v2/celery/task/#{task_id}"
    task_rsp = HTTParty.get(task_url, options)
    json = JSON.parse(task_rsp.body)
    if json['message'] == 'Task complete!'
      addSvg(json['output']['predict_expand'])
    end
    json
  end

  def self.png(smiles)
    url = Rails.configuration.inference.url
    options = { verify: false }
    encoded_smiles = URI::encode(smiles, '[]/()+-.@#=\\')
    svg_url = "https://#{url}/api/v2/draw/?smiles=#{encoded_smiles}&transparent=True"
    svg_rsp = HTTParty.get(svg_url, options)
    encoded_svg = Base64.strict_encode64(svg_rsp.body) # Encode SVG data using Base64
    encoded_svg
  end

  def self.fetchBuyables(smiles)
    url = Rails.configuration.inference.url
    options = { verify: false }
    encoded_smiles = URI::encode(smiles, '[]/()+-.@#=\\')
    buy_url = "https://#{url}/api/v2/buyables/?q=#{encoded_smiles}"
    buyables = HTTParty.get(buy_url, options)
    buyables
  end

  def self.fetchTemplate(template_id)
    url = Rails.configuration.inference.url
    options = { verify: false }
    template_url = "https://#{url}/api/v2/template/#{template_id}"
    template_resp = HTTParty.get(template_url, options)
    encoded_smiles = URI.encode_www_form_component(template_resp['template']['reaction_smarts'])

    
    template_resp['template']['svg'] = png(encoded_smiles)  
    template_resp
  end


  def self.products(reactant, reagent, solvent, num_res, products, flag)
    url = Rails.configuration.inference.url
    options = { :verify => false}
    reac = URI.encode_www_form_component(reactant)
    reag = reagent
    sol = URI.encode_www_form_component(solvent)
    numr = num_res
    begin
      url = "https://#{url}/api/forward/?reactants=#{reac}&reagents=#{reag}&solvent=#{sol}&num_results=#{numr}"
      rsp = HTTParty.get(url, options)
      json = JSON.parse(rsp.body)   
      if flag
        puts products
        if json['outcomes'].any? { |obj| obj['smiles'] == products }
            json['match'] = true
        else
            json['match'] = false
        end
      else 
        json['outcomes'].each do |node|
          puts node
          node['png'] = png(node['smiles'])
          node['buyables'] = fetchBuyables(node['smiles'])
          node['is_buyable'] = !node['buyables']['result'].empty?
        end
      end     

      json
    rescue StandardError => e
      err_body = { 'error' => "Prediction Server not found. Please try again later. Error: #{e.message}" }
      puts e.backtrace.join("\n") # Print the error stack trace to the console
      err_body
    end
  end


  def self.retro22(smis)
    url = Rails.configuration.inference.url
    options = { :verify => false, :timeout => 500}
    encoded_smiles = URI::encode(smis, '[]/()+-.@#=\\')

    begin
      url = "https://#{url}/api/treebuilder/?smiles=#{encoded_smiles}" #&filter_threshold=0.6
      rsp = HTTParty.get(url, options)
      json = JSON.parse(rsp.body)

        # Recursively update each node with SVG data
      addSvgData(json['trees'])

      json['request']['svg'] = png(json['request']['smiles'][0])

        # Return the updated JSON response
      json
      

    rescue StandardError => e
      err_body = { 'error' => "Prediction Server not found. Please try again later. Error: #{e.message}" }
      puts e.backtrace.join("\n") # Print the error stack trace to the console
      err_body
    end
  end

  def self.impurity(params)
    url = Rails.configuration.inference.url

    options = {
      body: params,
      verify: false

    }

    begin
      url = "https://#{url}/api/v2/impurity/"
      rsp = HTTParty.post(url, options)
      json = JSON.parse(rsp.body)

      json

    rescue StandardError => e
      err_body = { 'error' => "Prediction Server not found. Please try again later. Error: #{e.message}" }
      puts e.backtrace.join("\n") # Print the error stack trace to the console
      err_body
    end
  end


  def self.retrov2(params)
    url = Rails.configuration.inference.url

    # // body = {
    #   //   smiles: params.smis,
    #   //   version: params.version,
    #   //   max_depth: params.max_depth,
    #   //   max_branching: params.max_branching,
    #   //   expansion_time: params.expansion_time,
    #   //   template_count: params.template_count,
    #   //   max_cum_prob: params.max_cum_prob,
    #   //   buyable_logic: params.buyable_logic,
    #   //   max_ppg_logic: params.max_ppg_logic,
    #   //   max_ppg: params.max_ppg,
    #   //   max_scscore_logic: params.max_scscore_logic,
    #   //   max_scscore: params.max_scscore,
    #   //   chemical_property_logic: params.chemical_property_logic,
    #   //   max_chemprop_c: params.max_chemprop_c,
    #   //   max_chemprop_n: params.max_chemprop_n,
    #   //   max_chemprop_o: params.max_chemprop_o,
    #   //   max_chemprop_h: params.max_chemprop_h,
    #   //   chemical_popularity_logic: params.chemical_popularity_logic,
    #   //   min_chempop_reactants: params.min_chempop_reactants,
    #   //   min_chempop_products: params.min_chempop_products,
    #   //   filter_threshold: params.filter_threshold,
    #   //   template_set: params.template_set,
    #   //   template_prioritizer_version: params.template_prioritizer_version,
    #   //   buyables_source: params.buyables_source,
    #   //   return_first: params.return_first,
    #   //   max_trees: params.max_trees,
    #   //   score_trees: params.score_trees,
    #   //   cluster_trees: params.cluster_trees,
    #   //   cluster_method: params.cluster_method,
    #   //   cluster_min_samples: params.cluster_min_samples,
    #   //   cluster_min_size: params.cluster_min_size,
    #   //   json_format: params.json_format,
    #   //   store_results: params.store_results,
    #   //   description: params.description,
    #   //   banned_reactions: params.banned_reactions,
    #   //   banned_chemicals: params.banned_chemicals,
    #   //   priority: params.priority
    #   // }
    

    options = {
      body: params,
      verify: false

    }


    begin
      url = "https://#{url}/api/v2/tree-builder/"
      rsp = HTTParty.post(url, options)
      json = JSON.parse(rsp.body)

        # Recursively update each node with SVG data
      # addSvgData(json['trees'])

      # json['request']['svg'] = png(json['request']['smiles'][0])

        # Return the updated JSON response
      json
      

    rescue StandardError => e
      err_body = { 'error' => "Prediction Server not found. Please try again later. Error: #{e.message}" }
      puts e.backtrace.join("\n") # Print the error stack trace to the console
      err_body
    end
  end

  def self.retro(smis)

        # Define the base URL
        url = Rails.configuration.inference.url
        options = { :verify => false, :timeout => 500}
        encoded_smiles = URI::encode(smis, '[]/()+-.@#=\\') # Replace with the actual host URL

        # Build the query parameters
        params = {
        'smiles' => smis,
        'max_depth' => 4,
        'max_branching' => 25,
        'expansion_time' => 60,
        'max_ppg' => 10,
        'template_count' => 100,
        'max_cum_prob' => 0.995,
        'chemical_property_logic' => 'none',
        'max_chemprop_c' => 0,
        'max_chemprop_n' => 0,
        'max_chemprop_o' => 0,
        'max_chemprop_h' => 0,
        'chemical_popularity_logic' => 'none',
        'min_chempop_reactants' => 5,
        'min_chempop_products' => 5,
        'filter_threshold' => 0.25,
        'return_first' => 'true'
        }

        begin
          rsp = HTTParty.get("https://#{url}/api/treebuilder/", query: params, verify: false)
          json = JSON.parse(rsp.body)
    
            # Recursively update each node with SVG data
          addSvgData(json['trees'])
    
          json['request']['svg'] = png(json['request']['smiles'][0])
    
            # Return the updated JSON response
          json
          
    
        rescue StandardError => e
          err_body = { 'error' => "Prediction Server not found. Please try again later. Error: #{e.message}" }
          puts e.backtrace.join("\n") # Print the error stack trace to the console
          err_body
        end        
  end


  def self.svgapi(smis, inp_type)
    url = Rails.configuration.inference.url
    options = { :verify => false}

    begin
      url = "https://#{url}/api/v2/draw/smiles=#{smis}&input_type=#{inp_type}&transparent=True"
      rsp = HTTParty.get(url, options)
      json = JSON.parse(rsp.body)
      

    rescue StandardError => e
      err_body = { 'error' => 'SVG API failure' }
      err_body
    end
  end


  def self.llm(text, model)
    api_key = Rails.configuration.inference.api_key
    username = Rails.configuration.inference.username
    password = Rails.configuration.inference.password
    gpu_url = Rails.configuration.inference.gpu_url
    gpu_port = Rails.configuration.inference.gpu_port
    encoded_credentials = Base64.strict_encode64("#{username}:#{password}")

    begin
      rsp = HTTParty.post(
        "http://#{gpu_url}:#{gpu_port}/api/generate",
      headers: {
          'Accept' => 'application/json',
          'Authorization' => "Basic #{encoded_credentials}",
          'Content-Type' => 'application/json',          
        },
        body: {
            model: model,
            prompt: text,
            stream: false
        }.to_json,
        timeout: 1000
      )

      json = JSON.parse(rsp.body)

      

    rescue StandardError => e
      err_body = { 'error' => "LLM API failure. Error: #{e.message}" }
      err_body
    end
  end

end
