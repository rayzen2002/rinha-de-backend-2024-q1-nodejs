CREATE TABLE conta (
    id SERIAL PRIMARY KEY,
    limite INT NOT NULL,
    saldo INT,
    nome VARCHAR(100) NOT NULL
);

CREATE TABLE transacao (
    id SERIAL PRIMARY KEY,
    conta_id INT NOT NULL,
    valor INT NOT NULL,
    tipo VARCHAR(1) NOT NULL,
    descricao VARCHAR(10) NOT NULL,
    realizada_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conta_id) REFERENCES conta(id)
);

DO $$
BEGIN
  INSERT INTO conta (saldo, nome, limite)
  VALUES
  (0,'o barato sai caro', 1000 * 100),
    (0,'zan corp ltda', 800 * 100),
    (0,'les cruders', 10000 * 100),
    (0,'padaria joia de cocaia', 100000 * 100),
    (0,'kid mais', 5000 * 100);
END; $$;