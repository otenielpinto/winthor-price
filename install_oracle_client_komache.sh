#!/bin/bash

# Script para instalar o Oracle Instant Client 21.8 no Linux

# Verifica se é root
if [ "$(id -u)" -ne 0 ]; then
  echo "Este script precisa ser executado como root/sudo"
  exit 1
fi

# URL do Oracle Instant Client Basic Light 21.8
ORACLE_URL="https://download.oracle.com/otn_software/linux/instantclient/218000/instantclient-basiclite-linux.x64-21.8.0.0.0dbru.zip"
PACKAGE_NAME="instantclient-basiclite-linux.x64-21.8.0.0.0dbru.zip"
INSTALL_DIR="/opt/oracle"
CLIENT_DIR="instantclient_21_8"

# Instala dependências
apt-get update
apt-get install -y libaio1 unzip wget

# Cria diretório de instalação
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

# Baixa o Oracle Instant Client
echo "Baixando Oracle Instant Client 21.8..."
wget $ORACLE_URL -O $PACKAGE_NAME

# Extrai o pacote
echo "Extraindo arquivos..."
unzip $PACKAGE_NAME
rm $PACKAGE_NAME

# Configura variáveis de ambiente
echo "Configurando variáveis de ambiente..."
echo "export ORACLE_HOME=$INSTALL_DIR/$CLIENT_DIR" >> /etc/profile.d/oracle.sh
echo "export LD_LIBRARY_PATH=\$ORACLE_HOME:\$LD_LIBRARY_PATH" >> /etc/profile.d/oracle.sh
echo "export PATH=\$ORACLE_HOME:\$PATH" >> /etc/profile.d/oracle.sh
chmod +x /etc/profile.d/oracle.sh

# Atualiza ldconfig
echo "Atualizando ldconfig..."
echo "$INSTALL_DIR/$CLIENT_DIR" > /etc/ld.so.conf.d/oracle.conf
ldconfig

echo "Instalação concluída com sucesso!"
echo "Por favor, faça logout e login novamente ou execute:"
echo "source /etc/profile.d/oracle.sh"