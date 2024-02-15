import fastify, { FastifyReply, FastifyRequest } from 'fastify'
import z from 'zod'
import { Pool } from 'pg'
import { contaQuery } from './database/queries/conta'
import {
  criarTransacaoQuery,
  transacaoQuery,
} from './database/queries/transacao'

interface Customer {
  id: number
  saldo: number
  limite: number
}

interface Transactions {
  valor: number
  tipo: string
  descricao: string
  realizada_em: Date
}
const pool = new Pool({
  connectionString:
    process.env.DB_HOSTNAME ?? 'postgres://admin:xdd@localhost:5432/rinha',
  max: 20,
  // 20
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

pool.on('connect', () => {
  console.log('Connected to the database')
})

pool.on('error', (err) => {
  console.log('Unexpected error on idle client', err)
  process.exit(-1)
})

const server = fastify()
server.get(
  '/clientes/:id/extrato',
  async (request: FastifyRequest, reply: FastifyReply) => {
    const customerParamsSchema = z.object({
      id: z.number().int(),
    })
    const paramsId: number = request.params.id
    const validatedId = customerParamsSchema.safeParse({
      id: +paramsId,
    })
    // Validacao Se id : number
    if (!validatedId.success) {
      return reply
        .status(422)
        .send({ error: validatedId.error.issues[0].message })
    }

    const client = await pool.connect()
    try {
      const { rows } = await client.query(contaQuery(validatedId.data.id))
      // Validacao se o Cliente existe no banco
      if (rows.length === 0) {
        return reply.status(404).send({ message: 'Cliente invalido' })
      }

      const { rows: transactions } = await client.query(
        transacaoQuery(validatedId.data.id),
      )

      return {
        saldo: {
          total: rows[0].saldo,
          data_extrato: new Date(),
          limite: rows[0].limite,
        },
        ultimas_transacoes: transactions.map((transaction): Transactions => {
          return {
            valor: transaction.valor,
            tipo: transaction.tipo,
            descricao: transaction.descricao,
            realizada_em: transaction.realizada_em,
          }
        }),
      }
    } catch (error) {
      console.log(error)
      return reply.status(500).send({ message: 'Erro ao buscar extrato' })
    } finally {
      client.release()
    }
  },
)
server.post(
  '/clientes/:id/transacoes',
  async (request: FastifyRequest, reply: FastifyReply) => {
    // Params
    const customerParamsSchema = z.object({
      id: z.number().int(),
    })
    const paramsId: number = request.params.id
    const validatedId = customerParamsSchema.safeParse({
      id: +paramsId,
    })

    if (!validatedId.success) {
      return reply.status(422).send({ error: validatedId.error })
    }
    // Body
    const transactionBodySchema = z.object({
      valor: z.number().int(),
      tipo: z.literal('c').or(z.literal('d')),
      descricao: z.string().max(10).min(1),
    })
    const validatedBody = transactionBodySchema.safeParse(request.body)
    if (!validatedBody.success) {
      return reply.status(422).send({ error: validatedBody.error })
    }
    if (validatedBody.data.descricao === 'null') {
      return reply.status(422).send({ message: 'Descrição inválida' })
    }
    if (validatedBody.data.descricao === (null || '')) {
      return reply.status(422).send({ message: 'Descrição inválida' })
    }

    const isDebito = validatedBody.data.tipo === 'd'

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `SELECT * FROM conta WHERE id=${validatedId.data.id} FOR UPDATE`,
      )
      const { rows } = await client.query(contaQuery(validatedId.data.id))

      if (rows.length === 0) {
        await client.query('ROLLBACK')
        return reply.status(404).send({ message: 'Cliente invalido' })
      }
      const cliente: Customer = rows[0]
      const valor =
        validatedBody.data.tipo === 'c'
          ? validatedBody.data.valor
          : -validatedBody.data.valor

      const saldoPosTransacao = cliente.saldo + valor
      if (isDebito && cliente.saldo + valor < -cliente.limite) {
        await client.query('ROLLBACK')
        return reply.status(422).send({ error: 'Saldo Insuficiente' })
      }

      if ((isDebito && isNaN(valor)) || valor < -cliente.limite) {
        await client.query('ROLLBACK')
        return reply.status(422).send({ message: 'Saldo insuficiente' })
      }

      await client.query(
        `UPDATE conta SET saldo =${saldoPosTransacao} WHERE id= ${validatedId.data.id}`,
      )
      await client.query(
        criarTransacaoQuery(
          validatedId.data.id,
          validatedBody.data.valor,
          validatedBody.data.tipo,
          validatedBody.data.descricao,
        ),
      )
      await client.query('COMMIT')
      return {
        saldo: saldoPosTransacao,
        limite: cliente.limite,
      }
    } catch (error) {
      await client.query('ROLLBACK')
      console.error(error)
      return reply
        .status(500)
        .send({ error: `Erro ao realziar transacao: \n ${error}` })
    } finally {
      client.release()
    }
  },
)

server.listen({ port: 8000, host: '0.0.0.0' }).then(() => {
  console.log(`🚀 HTTP Server running on port: 8000 🚀`)
})
