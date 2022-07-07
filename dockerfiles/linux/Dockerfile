FROM centos:7

RUN yum install -y which centos-release-scl \
  && yum install -y devtoolset-9-gcc \
    devtoolset-9-gcc-c++ \
    make \
    python3 \
    curl \
  && curl -sL https://rpm.nodesource.com/setup_16.x | bash - \
  && yum install -y nodejs && npm install nexe -g \
  && echo "source /opt/rh/devtoolset-9/enable" >> /etc/bashrc

SHELL ["/bin/bash", "--login", "-c"]
