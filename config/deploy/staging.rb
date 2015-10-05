#server 'astra1862.startdedicated.de', user: 'deploy', roles: %w{app web db}

 set :ssh_options, {
   forward_agent: true,
   auth_methods: %w(publickey)
 }
