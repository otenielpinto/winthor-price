# Passo a Passo para Instalação do Oracle Instant Client no Linux

Este documento descreve os comandos executados para resolver o erro:

```
DPI-1047: Cannot locate a 64-bit Oracle Client library
```

## 1. Instalação Inicial

Primeiro, executamos o script de instalação com privilégios de root:

```bash
sudo ./install-oracle-client.sh
```

## 2. Resolução de Problemas com Unzip

Identificamos que o comando `unzip` não estava disponível. Instalamos o pacote necessário:

```bash
sudo apt-get install -y unzip
```

## 3. Reinstalação Completa

Removemos os arquivos antigos e executamos novamente o script de instalação:

```bash
sudo rm -rf /opt/oracle/instantclient_21_8/*
sudo ./install-oracle-client.sh
```

## 4. Verificação das Bibliotecas

Verificamos se as bibliotecas foram instaladas corretamente:

```bash
ldconfig -p | grep libclntsh
LD_LIBRARY_PATH=/opt/oracle/instantclient_21_8 ldd /opt/oracle/instantclient_21_8/libclntsh.so.21.1
```

## 5. Instalação de Dependências Adicionais

Instalamos a biblioteca libaio1 necessária:

```bash
sudo apt-get install -y libaio1
```

## 6. Verificação Final

Confirmamos que todas as dependências estão resolvidas:

```bash
LD_LIBRARY_PATH=/opt/oracle/instantclient_21_8 ldd /opt/oracle/instantclient_21_8/libclntsh.so.21.1
```

## Configuração do Ambiente

Certifique-se de que seu arquivo `.env` contenha:

```
LD_LIBRARY_PATH=/opt/oracle/instantclient_21_8
```

## Reinicialização da Aplicação

Finalmente, reinicie sua aplicação:

```bash
npm start
```
