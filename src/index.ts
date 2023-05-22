import { knex, Knex } from 'knex';

export type KnextraConfig = Knex.Config & { replicas?: Knex.Config[] };

const SQL_WRITE_METHODS = [
  'create',
  'alter',
  'drop',
  'truncate',
  'rename',
  'raw',
  'insert',
  'update',
  'del',
];

const isWriteQuery = (query: Knex.Sql): boolean =>
  SQL_WRITE_METHODS.includes(query.method);

const isWriteBuilder = (
  builder: Knex.QueryBuilder
): boolean => {
  const queryContext = builder.queryContext();

  if (queryContext && 'usePrimary' in queryContext) {
    console.log('queryContext.usePrimary', queryContext.usePrimary);
    return queryContext?.usePrimary;
  }

  const sql = builder.toSQL();

  return Array.isArray(sql) ? sql.some(isWriteQuery) : isWriteQuery(sql);
};

const createClientProxy = (primary: Knex, replicas: Knex[]) => {
  new Proxy(primary.client, {
    get(target, prop, receiver) {
      // override runner
      if (prop === 'runner' && typeof target[prop] === 'function') {
        return new Proxy(target[prop], {
          apply: (target, thisArg, argumentsList) => {
            console.log('running query');
            const [builder] = argumentsList;
            const usePrimary = isWriteBuilder(builder);
            console.log('usePrimary', usePrimary);

            return (usePrimary ? primary : replicas[0]).client.runner(...argumentsList);
          }
        });
      }

      // override destroy
      if (prop === 'destroy' && typeof target[prop] === 'function') {
        return new Proxy(target[prop], {
          apply: async (target, thisArg, argumentsList) => {
            console.log('destroying clients');
            for (const replica of replicas) {
              await replica.client.destroy(...argumentsList);
            }
            await primary.client.destroy(...argumentsList);
          }
        });
      }

      return Reflect.get(target, prop, receiver);
    }
  });
}

export const knextra = (config: KnextraConfig) => {
  const primary = knex(config);
  const replicas = config.replicas?.map(replica => knex(replica)) ?? [];
  const clientProxy = createClientProxy(primary, replicas);

  return new Proxy(primary, {
    get(target, prop) {
      if (prop === 'client') {
        return clientProxy;
      }

      return Reflect.get(target, prop);
    },
  });
};
