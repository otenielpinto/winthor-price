# Instalação do Oracle Client para Komache Server

## Pré-requisitos

- Sistema Linux 64-bit
- Acesso root (sudo)
- Pacotes básicos: libaio1, unzip, wget

## Passo 1: Renomear o script de instalação

```bash

chmod +x install_oracle_client_komache.sh
```

## Passo 2: Executar o script de instalação

```bash
sudo ./install_oracle_client_komache.sh
```

## Passo 3: Configurar ambiente

Após instalação, execute:

```bash
source /etc/profile.d/oracle.sh
```

## Verificação da instalação

Para confirmar que tudo está correto:

```bash
ls /opt/oracle/instantclient_21_8
echo $LD_LIBRARY_PATH
```

## Configuração para aplicações Node.js

Sempre inclua estas variáveis ao executar sua aplicação:

```bash
export ORACLE_HOME=/opt/oracle/instantclient_21_8
export LD_LIBRARY_PATH=$ORACLE_HOME:$LD_LIBRARY_PATH
node seu_app.js
```

## Solução de problemas

### Erro: "libaio.so.1: cannot open shared object file"

Verifique os links simbólicos:

```bash
ls -la /lib/x86_64-linux-gnu/libaio*
```

Se necessário, recrie o link:

```bash
sudo ln -sf /lib/x86_64-linux-gnu/libaio.so.1t64 /lib/x86_64-linux-gnu/libaio.so.1
sudo ldconfig
```

## Atualização

Para atualizar o Oracle Client:

1. Baixe a nova versão do site oficial
2. Execute novamente o script de instalação
3. Atualize as variáveis de ambiente

## Documentação oficial

- [Oracle Instant Client](https://www.oracle.com/database/technologies/instant-client.html)
- [Node-oracledb](https://oracle.github.io/node-oracledb/)
