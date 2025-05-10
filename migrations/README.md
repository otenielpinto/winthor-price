# Migrations - Guia de Uso

Este documento detalha como usar e gerenciar as migrações de banco de dados SQLite no projeto Winthor Price.

## O que são migrações?

Migrações são arquivos que controlam versões do seu banco de dados. Elas permitem:

1. Criar tabelas
2. Modificar tabelas existentes
3. Inserir dados iniciais
4. Controlar atualizações do esquema de banco de dados
5. Reverter alterações quando necessário

## Estrutura das Migrações

Cada arquivo de migração possui duas funções principais:

- `up()`: Executa as alterações no banco de dados (criar tabelas, adicionar colunas, etc.)
- `down()`: Reverte as alterações feitas pela função `up()`

## Como Executar Migrações

### Executar uma Migração Específica

Para executar uma migração específica, use o Node.js para executar o arquivo diretamente:

```bash
node migrations/nome_do_arquivo_migracao.js
```

Exemplo:

```bash
node migrations/create_product_price_table.js
```

### Verificar o Estado do Banco de Dados

Para verificar se as tabelas foram criadas corretamente:

```bash
sqlite3 dados_erp.db ".tables"
```

Para verificar a estrutura de uma tabela específica:

```bash
sqlite3 dados_erp.db ".schema produto_preco_new"
```

## Como Criar Novas Migrações

1. Crie um novo arquivo na pasta `migrations/` seguindo o padrão de nomenclatura:

   ```
   migrations/YYYYMMDD_descricao_da_migracao.js
   ```

2. Use o seguinte template para sua migração:

```javascript
/**
 * Migration: Descrição da migração
 */
import { sql3Client } from "../config/sql3Client.js";
import { fileURLToPath } from "url";

/**
 * Executa a migração - criação/alteração de tabelas
 */
export async function up() {
  const knex = sql3Client();

  // Exemplo de criação de tabela
  await knex.schema.createTable("nome_da_tabela", (table) => {
    table.increments("id").primary();
    table.string("campo_texto");
    table.integer("campo_numero");
    // Adicione outros campos conforme necessário
  });
}

/**
 * Reverte a migração
 */
export async function down() {
  const knex = sql3Client();
  return knex.schema.dropTableIfExists("nome_da_tabela");
}

// Executa a migração se o arquivo for executado diretamente
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const knex = sql3Client();

  up()
    .then(() => {
      console.log("Migração concluída com sucesso");
      knex.destroy();
    })
    .catch((error) => {
      console.error("Falha na migração:", error);
      knex.destroy();
      process.exit(1);
    });
}
```

## Boas Práticas

1. **Idempotência**: Certifique-se de que suas migrações possam ser executadas múltiplas vezes sem causar erros. Use verificações como `hasTable()` antes de criar uma tabela.

2. **Atomicidade**: Cada migração deve fazer uma única alteração lógica no banco de dados.

3. **Compatibilidade**: Não crie migrações que quebrem compatibilidade com versões anteriores do aplicativo.

4. **Backup**: Sempre faça backup do banco de dados antes de executar migrações em ambiente de produção.

## Exemplos

### Adicionar uma Nova Coluna

```javascript
export async function up() {
  const knex = sql3Client();

  if (await knex.schema.hasTable("produto_preco_new")) {
    await knex.schema.table("produto_preco_new", (table) => {
      table.string("nova_coluna");
    });
  }
}

export async function down() {
  const knex = sql3Client();

  if (await knex.schema.hasTable("produto_preco_new")) {
    await knex.schema.table("produto_preco_new", (table) => {
      table.dropColumn("nova_coluna");
    });
  }
}
```

### Inserir Dados Iniciais

```javascript
export async function up() {
  const knex = sql3Client();

  await knex("tabela").insert([
    { campo1: "valor1", campo2: "valor2" },
    { campo1: "valor3", campo2: "valor4" },
  ]);
}

export async function down() {
  const knex = sql3Client();

  await knex("tabela").where("campo1", "valor1").delete();
  await knex("tabela").where("campo1", "valor3").delete();
}
```

## Solução de Problemas

Se encontrar erros ao executar as migrações:

1. Verifique se o banco de dados SQLite existe e está acessível
2. Verifique se a estrutura da tabela já existe antes de tentar criá-la
3. Use `try-catch` em suas migrações para tratar erros específicos
