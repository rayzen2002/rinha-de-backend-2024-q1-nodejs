import { Client, QueryResult, QueryResultBase, Submittable } from 'pg'



async function query(queryString: string): Promise<QueryResult> {
  const client = new Client({
    // connectionString: process.env.DB_HOSTNAME ?? "postgres://admin:xdd@db:5432/rinha",
    host:  "localhost",
    port:  5432,
    user:  "admin",
    database:  "rinha",
    password: "xdd",
  })
  try {
    await client.connect()
    const res  = await client.query(queryString) 
    return res
  } catch (error) {
    console.log(error)
  }
    await client.end()
}

export default {
  query: query,
}