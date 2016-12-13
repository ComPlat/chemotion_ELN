FROM ruby:2.3.1

# prepare
RUN apt-get -y update --fix-missing
RUN apt-get -y install apt-utils
RUN apt-get -y install build-essential wget git cmake nodejs sudo --fix-missing

# install curl
RUN apt-get -y install curl
RUN curl -sL https://deb.nodesource.com/setup_4.x | bash

# install rmagick
RUN apt-get -y install libmagickcore-dev libmagickwand-dev

# create docker user
RUN useradd -ms /bin/bash docker
RUN echo 'docker ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers

# node + npm via nvm; install npm packages
WORKDIR /tmp
RUN curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.3/install.sh | NVM_DIR=/usr/local/nvm bash
COPY package.json /tmp/
COPY .nvmrc /tmp/
RUN /bin/bash -c 'source /usr/local/nvm/nvm.sh;\
    nvm install;\
    nvm use;\
    npm install'
RUN echo '[ -s /usr/local/nvm/nvm.sh ] && . /usr/local/nvm/nvm.sh' >> /home/docker/.bashrc

# configure app
ENV BUNDLE_PATH /box
WORKDIR /usr/src/app
COPY . /usr/src/app/
RUN cp -a /tmp/node_modules /usr/src/app/
RUN sudo chown -R docker:nogroup /usr/src/app
RUN cp -a config/database.yml.example config/database.yml
RUN chmod +x run.sh
CMD ./run.sh
