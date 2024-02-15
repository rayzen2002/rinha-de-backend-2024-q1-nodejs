export const transacaoQuery = (id: number) => `
SELECT * 
FROM (
  SELECT * 
  FROM transacao
  WHERE conta_id =${id}
  ORDER BY id DESC  
  LIMIT 10
) AS t
WHERE t.descricao IS NOT NULL;
`

export const criarTransacaoQuery = (
  id: number,
  valor: number,
  tipo: string,
  descricao: string,
) => `
INSERT INTO transacao (conta_id, valor, tipo, descricao)
VALUES (${id},${valor},'${tipo}','${descricao}');
`
