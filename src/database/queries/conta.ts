export const contaQuery = (id: number) => `
SELECT saldo, limite FROM conta
WHERE id=${id};
`
