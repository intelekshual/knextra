import { knextra } from './index';

const testConfig = {
  client: 'sqlite3',
  connection: {
    filename: './data.db',
  },
  replicas: [
    {
      client: 'sqlite3',
      connection: {
        filename: './data2.db',
      }
    }
  ]
}

describe('knextra', () => {
  test('should work', async () => {
    const knex = knextra(testConfig);
    
    await knex.schema.createTable('users', table => {
      table.increments('id');
      table.string('user_name');
    });

    const users = await knex('users').select('*');

    await knex.client.destroy();

    expect(knex).toBeDefined();
    expect(users).toHaveLength(0);
  });
});
